import fs from "node:fs/promises";
import path from "node:path";
import {
	argbFromRgb,
	type DynamicScheme,
	Hct,
	hexFromArgb,
	QuantizerCelebi,
	SchemeContent,
	SchemeExpressive,
	SchemeFidelity,
	SchemeFruitSalad,
	SchemeMonochrome,
	SchemeNeutral,
	SchemeRainbow,
	SchemeTonalSpot,
	SchemeVibrant,
	Score,
} from "@material/material-color-utilities";
import sharp from "sharp";
import type { MonetConfig, MonetVariant } from "@/types/config";

export type MonetThemeResult = {
	seedHex: string;
	hue: number;
	variant: MonetVariant;
	themeColorLight: string;
	themeColorDark: string;
	css: string;
};

const monetThemeCache = new Map<string, MonetThemeResult | null>();

function resolveBannerFilePath(bannerSrc: string): string | null {
	const trimmed = bannerSrc.trim();
	if (
		!trimmed ||
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("data:")
	) {
		return null;
	}

	if (trimmed.startsWith("/")) {
		return path.join(process.cwd(), "public", trimmed.slice(1));
	}

	return path.join(process.cwd(), "src", trimmed);
}

function createMonetScheme(
	variant: MonetVariant,
	sourceColorHct: Hct,
	isDark: boolean,
	contrastLevel: number,
): DynamicScheme {
	switch (variant) {
		case "content":
			return new SchemeContent(sourceColorHct, isDark, contrastLevel);
		case "tonalSpot":
			return new SchemeTonalSpot(sourceColorHct, isDark, contrastLevel);
		case "vibrant":
			return new SchemeVibrant(sourceColorHct, isDark, contrastLevel);
		case "expressive":
			return new SchemeExpressive(sourceColorHct, isDark, contrastLevel);
		case "neutral":
			return new SchemeNeutral(sourceColorHct, isDark, contrastLevel);
		case "monochrome":
			return new SchemeMonochrome(sourceColorHct, isDark, contrastLevel);
		case "rainbow":
			return new SchemeRainbow(sourceColorHct, isDark, contrastLevel);
		case "fruitSalad":
			return new SchemeFruitSalad(sourceColorHct, isDark, contrastLevel);
		default:
			return new SchemeFidelity(sourceColorHct, isDark, contrastLevel);
	}
}

function srgbChannelToLinear(channel: number): number {
	const v = channel / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Convert an ARGB integer to an approximate OKLCH hue angle (0..360). */
function argbToOklchHue(argb: number): number {
	const r = srgbChannelToLinear((argb >> 16) & 0xff);
	const g = srgbChannelToLinear((argb >> 8) & 0xff);
	const b = srgbChannelToLinear(argb & 0xff);

	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

	let hue = (Math.atan2(okB, a) * 180) / Math.PI;
	if (hue < 0) hue += 360;
	return Math.round(hue) % 360;
}

function formatCssVars(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([key, value]) => `\t${key}: ${value};`)
		.join("\n");
}

function buildSchemeCss(light: DynamicScheme, dark: DynamicScheme): string {
	const lightVars: Record<string, string> = {
		"--primary": hexFromArgb(light.primary),
		"--page-bg": hexFromArgb(light.surfaceContainer),
		"--card-bg": hexFromArgb(light.surfaceContainerLowest),
		"--float-panel-bg": hexFromArgb(light.surfaceContainerLowest),

		"--btn-content": hexFromArgb(light.onSecondaryContainer),
		"--btn-regular-bg": hexFromArgb(light.secondaryContainer),
		"--btn-regular-bg-hover": hexFromArgb(light.secondaryPalette.tone(86)),
		"--btn-regular-bg-active": hexFromArgb(light.secondaryPalette.tone(80)),

		"--btn-plain-bg-hover": hexFromArgb(light.surfaceContainerHigh),
		"--btn-plain-bg-active": hexFromArgb(light.surfaceContainerHighest),

		"--btn-card-bg-hover": hexFromArgb(light.surfaceContainerLow),
		"--btn-card-bg-active": hexFromArgb(light.surfaceContainerHigh),

		"--deep-text": hexFromArgb(light.onSurface),
		"--title-active": hexFromArgb(light.primary),

		"--selection-bg": hexFromArgb(light.primaryPalette.tone(90)),
		"--codeblock-selection": hexFromArgb(dark.primaryPalette.tone(32)),
		"--codeblock-bg": hexFromArgb(dark.surfaceContainerLow),
		"--codeblock-topbar-bg": hexFromArgb(dark.surfaceContainerHigh),

		"--link-underline": hexFromArgb(light.primaryPalette.tone(88)),
		"--link-hover": hexFromArgb(light.secondaryContainer),
		"--link-active": hexFromArgb(light.primaryPalette.tone(84)),

		"--toc-badge-bg": hexFromArgb(light.secondaryContainer),
		"--toc-btn-hover": hexFromArgb(light.surfaceContainerHigh),
		"--toc-btn-active": hexFromArgb(light.surfaceContainerHighest),
		"--toc-item-active": hexFromArgb(light.primary),

		"--md-sys-color-primary": hexFromArgb(light.primary),
		"--md-sys-color-on-primary": hexFromArgb(light.onPrimary),
		"--md-sys-color-primary-container": hexFromArgb(light.primaryContainer),
		"--md-sys-color-on-primary-container": hexFromArgb(
			light.onPrimaryContainer,
		),
		"--md-sys-color-secondary": hexFromArgb(light.secondary),
		"--md-sys-color-secondary-container": hexFromArgb(light.secondaryContainer),
		"--md-sys-color-on-secondary-container": hexFromArgb(
			light.onSecondaryContainer,
		),
		"--md-sys-color-tertiary": hexFromArgb(light.tertiary),
		"--md-sys-color-surface": hexFromArgb(light.surface),
		"--md-sys-color-surface-container": hexFromArgb(light.surfaceContainer),
		"--md-sys-color-on-surface": hexFromArgb(light.onSurface),
		"--md-sys-color-outline-variant": hexFromArgb(light.outlineVariant),
	};

	const darkVars: Record<string, string> = {
		"--primary": hexFromArgb(dark.primary),
		"--page-bg": hexFromArgb(dark.surface),
		"--card-bg": hexFromArgb(dark.surfaceContainer),
		"--float-panel-bg": hexFromArgb(dark.surfaceContainerLow),

		"--btn-content": hexFromArgb(dark.onSecondaryContainer),
		"--btn-regular-bg": hexFromArgb(dark.secondaryContainer),
		"--btn-regular-bg-hover": hexFromArgb(dark.secondaryPalette.tone(36)),
		"--btn-regular-bg-active": hexFromArgb(dark.secondaryPalette.tone(42)),

		"--btn-plain-bg-hover": hexFromArgb(dark.surfaceContainerHigh),
		"--btn-plain-bg-active": hexFromArgb(dark.surfaceContainerHighest),

		"--btn-card-bg-hover": hexFromArgb(dark.surfaceContainerHigh),
		"--btn-card-bg-active": hexFromArgb(dark.surfaceContainerHighest),

		"--deep-text": hexFromArgb(dark.onSurface),
		"--title-active": hexFromArgb(dark.primary),

		"--selection-bg": hexFromArgb(dark.primaryPalette.tone(32)),
		"--codeblock-selection": hexFromArgb(dark.primaryPalette.tone(32)),
		"--codeblock-bg": hexFromArgb(dark.surfaceContainerLow),
		"--codeblock-topbar-bg": hexFromArgb(dark.surfaceContainerLowest),

		"--link-underline": hexFromArgb(dark.primaryPalette.tone(35)),
		"--link-hover": hexFromArgb(dark.secondaryContainer),
		"--link-active": hexFromArgb(dark.primaryPalette.tone(30)),

		"--toc-badge-bg": hexFromArgb(dark.secondaryContainer),
		"--toc-btn-hover": hexFromArgb(dark.surfaceContainerHigh),
		"--toc-btn-active": hexFromArgb(dark.surfaceContainerHighest),
		"--toc-item-active": hexFromArgb(dark.primaryPalette.tone(35)),

		"--md-sys-color-primary": hexFromArgb(dark.primary),
		"--md-sys-color-on-primary": hexFromArgb(dark.onPrimary),
		"--md-sys-color-primary-container": hexFromArgb(dark.primaryContainer),
		"--md-sys-color-on-primary-container": hexFromArgb(dark.onPrimaryContainer),
		"--md-sys-color-secondary": hexFromArgb(dark.secondary),
		"--md-sys-color-secondary-container": hexFromArgb(dark.secondaryContainer),
		"--md-sys-color-on-secondary-container": hexFromArgb(
			dark.onSecondaryContainer,
		),
		"--md-sys-color-tertiary": hexFromArgb(dark.tertiary),
		"--md-sys-color-surface": hexFromArgb(dark.surface),
		"--md-sys-color-surface-container": hexFromArgb(dark.surfaceContainer),
		"--md-sys-color-on-surface": hexFromArgb(dark.onSurface),
		"--md-sys-color-outline-variant": hexFromArgb(dark.outlineVariant),
	};

	return `:root[data-monet-theme] {\n${formatCssVars(lightVars)}\n}\n:root[data-monet-theme].dark {\n${formatCssVars(darkVars)}\n}`;
}

export async function getBannerMonetTheme(
	bannerSrc: string,
	monetConfig?: MonetConfig,
): Promise<MonetThemeResult | null> {
	if (!monetConfig?.enable) {
		return null;
	}

	const imagePath = resolveBannerFilePath(bannerSrc);
	if (!imagePath) {
		return null;
	}

	const variant: MonetVariant = monetConfig.variant ?? "fidelity";
	const contrastLevel = Math.max(
		-1,
		Math.min(1, monetConfig.contrastLevel ?? 0),
	);

	try {
		const stat = await fs.stat(imagePath);
		const cacheKey = `${imagePath}:${stat.mtimeMs}:${variant}:${contrastLevel}`;
		if (monetThemeCache.has(cacheKey)) {
			return monetThemeCache.get(cacheKey) ?? null;
		}

		const { data, info } = await sharp(imagePath)
			.rotate()
			.resize({ width: 128, height: 128, fit: "inside" })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		const pixels: number[] = [];
		for (let i = 0; i < data.length; i += info.channels) {
			if (data[i + 3] < 128) continue;
			pixels.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
		}

		if (pixels.length === 0) {
			monetThemeCache.set(cacheKey, null);
			return null;
		}

		const quantized = QuantizerCelebi.quantize(pixels, 128);
		const scored = Score.score(quantized);
		const seedArgb = scored[0];
		if (seedArgb === undefined) {
			monetThemeCache.set(cacheKey, null);
			return null;
		}

		const sourceHct = Hct.fromInt(seedArgb);
		const lightScheme = createMonetScheme(
			variant,
			sourceHct,
			false,
			contrastLevel,
		);
		const darkScheme = createMonetScheme(
			variant,
			sourceHct,
			true,
			contrastLevel,
		);

		const result: MonetThemeResult = {
			seedHex: hexFromArgb(seedArgb),
			hue: argbToOklchHue(seedArgb),
			variant,
			themeColorLight: hexFromArgb(lightScheme.surfaceContainer),
			themeColorDark: hexFromArgb(darkScheme.surface),
			css: buildSchemeCss(lightScheme, darkScheme),
		};

		monetThemeCache.set(cacheKey, result);
		return result;
	} catch (error) {
		console.warn(
			`[monet-theme] Unable to generate Monet theme from ${bannerSrc}; falling back to themeColor.hue.`,
			error,
		);
		return null;
	}
}
