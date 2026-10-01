import { h } from "hastscript";

/**
 * Render a compact, reusable generative AI disclosure card.
 * Markdown usage: :::ai-disclosure{model="..." purpose="..." scope="..."} :::
 */
export function AiDisclosureComponent(properties) {
	const fields = [
		["模型", properties.model],
		["用途", properties.purpose],
		["范围", properties.scope],
	];

	return h("aside.ai-disclosure", { "aria-label": "本文的 AI 使用说明" }, [
		h("header.ai-disclosure-header", [
			h("div.ai-disclosure-title", "本文的 AI 使用说明"),
			h("div.ai-disclosure-subtitle", "辅助工具与使用范围"),
		]),
		h(
			"dl.ai-disclosure-fields",
			fields.map(([label, value]) =>
				h("div.ai-disclosure-field", [h("dt", label), h("dd", value || "未说明")]),
			),
		),
	]);
}
