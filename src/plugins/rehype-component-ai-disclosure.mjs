import { h } from "hastscript";

/**
 * Render a compact, reusable generative AI disclosure card.
 * Markdown usage: :::ai-disclosure{model="..." purpose="..." scope="..."} :::
 */
export function AiDisclosureComponent(properties) {
	const fields = [
		["工具", properties.model],
		["参与", properties.purpose],
		["边界", properties.scope],
	];

	return h("aside.ai-disclosure", { "aria-label": "本文的创作注记" }, [
		h("header.ai-disclosure-header", [
			h("div.ai-disclosure-mark", "AI"),
			h("div", [
				h("div.ai-disclosure-title", "创作注记"),
				h("div.ai-disclosure-subtitle", "记录工具参与的边界，不替代作者判断"),
			]),
		]),
		h(
			"dl.ai-disclosure-fields",
			fields.map(([label, value]) =>
				h("div.ai-disclosure-field", [h("dt", label), h("dd", value || "未说明")]),
			),
		),
	]);
}
