import type { APIRoute } from "astro";

const RESEND_API_BASE = "https://api.resend.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

async function getResendErrorMessage(response: Response): Promise<string> {
	try {
		const data = (await response.json()) as { message?: string; name?: string };
		return data.message || data.name || `Resend request failed (${response.status})`;
	} catch {
		return `Resend request failed (${response.status})`;
	}
}

async function resendRequest(
	apiKey: string,
	path: string,
	init: RequestInit,
): Promise<Response> {
	return fetch(`${RESEND_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			...init.headers,
		},
	});
}

async function createOrUpdateContact(email: string, apiKey: string, segmentId: string) {
	const createResponse = await resendRequest(apiKey, "/contacts", {
		method: "POST",
		body: JSON.stringify({
			email,
			unsubscribed: false,
			segments: [{ id: segmentId }],
			properties: {
				source: "blog",
			},
		}),
	});

	if (createResponse.ok) {
		return;
	}

	if (createResponse.status !== 409) {
		throw new Error(await getResendErrorMessage(createResponse));
	}

	const updateResponse = await resendRequest(
		apiKey,
		`/contacts/${encodeURIComponent(email)}`,
		{
			method: "PATCH",
			body: JSON.stringify({
				unsubscribed: false,
				properties: {
					source: "blog",
				},
			}),
		},
	);

	if (!updateResponse.ok && updateResponse.status !== 404) {
		throw new Error(await getResendErrorMessage(updateResponse));
	}

	const addSegmentResponse = await resendRequest(
		apiKey,
		`/contacts/${encodeURIComponent(email)}/segments/${segmentId}`,
		{
			method: "POST",
		},
	);

	if (!addSegmentResponse.ok && addSegmentResponse.status !== 409) {
		throw new Error(await getResendErrorMessage(addSegmentResponse));
	}
}

export const POST: APIRoute = async ({ request }) => {
	const apiKey = import.meta.env.RESEND_API_KEY;
	const segmentId = import.meta.env.RESEND_BLOG_SEGMENT_ID;

	if (!apiKey) {
		return jsonResponse(
			{ ok: false, error: "Server is not configured with RESEND_API_KEY." },
			500,
		);
	}
	if (!segmentId) {
		return jsonResponse(
			{ ok: false, error: "Server is not configured with RESEND_BLOG_SEGMENT_ID." },
			500,
		);
	}

	let email = "";
	const contentType = request.headers.get("content-type") || "";

	try {
		if (contentType.includes("application/json")) {
			const body = (await request.json()) as { email?: string };
			email = body.email || "";
		} else {
			const formData = await request.formData();
			email = String(formData.get("email") || "");
		}
	} catch {
		return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
	}

	email = email.trim().toLowerCase();
	if (!email || !EMAIL_REGEX.test(email)) {
		return jsonResponse({ ok: false, error: "Please provide a valid email." }, 400);
	}

	try {
		await createOrUpdateContact(email, apiKey, segmentId);
		return jsonResponse({ ok: true, message: "Subscribed successfully." });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Subscription failed.";
		return jsonResponse({ ok: false, error: message }, 502);
	}
};
