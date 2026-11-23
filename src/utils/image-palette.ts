import sharp from "sharp";

type ColorSample = {
	r: number;
	g: number;
	b: number;
	weight: number;
};

type Bucket = ColorSample[];

const FALLBACK_PALETTE = ["#153c52", "#49304f", "#171421"];

/** Build a small deterministic palette from the image's most common colors. */
export async function getImagePalette(imagePath: string): Promise<string[]> {
	try {
		const { data, info } = await sharp(imagePath)
			.rotate()
			.resize({ width: 56, height: 56, fit: "inside" })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		const histogram = new Map<number, ColorSample>();
		for (let i = 0; i < data.length; i += info.channels) {
			const alpha = data[i + 3];
			if (alpha < 144) continue;

			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const brightness = (r * 299 + g * 587 + b * 114) / 1000;
			if (brightness < 18 || brightness > 245) continue;

			// Five-bit RGB buckets reduce noise from antialiasing and subtle texture.
			const qr = r >> 3;
			const qg = g >> 3;
			const qb = b >> 3;
			const key = (qr << 10) | (qg << 5) | qb;
			const sample = histogram.get(key);
			if (sample) {
				sample.weight++;
			} else {
				histogram.set(key, {
					r: Math.min(255, qr * 8 + 4),
					g: Math.min(255, qg * 8 + 4),
					b: Math.min(255, qb * 8 + 4),
					weight: 1,
				});
			}
		}

		const samples = [...histogram.values()];
		if (samples.length === 0) return FALLBACK_PALETTE;

		// Median-cut splits the most visually significant color range until there
		// are three clusters, making the resulting gradient varied but repeatable.
		const buckets: Bucket[] = [samples];
		while (buckets.length < 3) {
			const candidateIndex = buckets
				.map((bucket, index) => ({ bucket, index, range: getRange(bucket) }))
				.filter(({ bucket }) => bucket.length > 1)
				.sort((a, b) => b.range.score - a.range.score)[0]?.index;
			if (candidateIndex === undefined) break;

			const bucket = buckets[candidateIndex];
			const { channel } = getRange(bucket);
			const sorted = [...bucket].sort((a, b) => a[channel] - b[channel]);
			const totalWeight = sorted.reduce((sum, color) => sum + color.weight, 0);
			let accumulated = 0;
			let splitAt = 1;
			for (let i = 0; i < sorted.length - 1; i++) {
				accumulated += sorted[i].weight;
				if (accumulated >= totalWeight / 2) {
					splitAt = i + 1;
					break;
				}
			}

			buckets.splice(candidateIndex, 1, sorted.slice(0, splitAt), sorted.slice(splitAt));
		}

		return buckets
			.map(getAverageColor)
			.sort((a, b) => rgbToHsl(a).h - rgbToHsl(b).h)
			.map(toDarkGradientColor);
	} catch (error) {
		console.warn(`Unable to extract colors from ${imagePath}; using fallback palette.`, error);
		return FALLBACK_PALETTE;
	}
}

function getRange(bucket: Bucket) {
	const channels = ["r", "g", "b"] as const;
	const ranges = channels.map((channel) => {
		const values = bucket.map((sample) => sample[channel]);
		return { channel, range: Math.max(...values) - Math.min(...values) };
	});
	const widest = ranges.sort((a, b) => b.range - a.range)[0];
	const weight = bucket.reduce((sum, sample) => sum + sample.weight, 0);
	return { channel: widest.channel, score: widest.range * weight };
}

function getAverageColor(bucket: Bucket): Pick<ColorSample, "r" | "g" | "b"> {
	const weight = bucket.reduce((sum, sample) => sum + sample.weight, 0);
	return {
		r: Math.round(bucket.reduce((sum, sample) => sum + sample.r * sample.weight, 0) / weight),
		g: Math.round(bucket.reduce((sum, sample) => sum + sample.g * sample.weight, 0) / weight),
		b: Math.round(bucket.reduce((sum, sample) => sum + sample.b * sample.weight, 0) / weight),
	};
}

function rgbToHsl({ r, g, b }: Pick<ColorSample, "r" | "g" | "b">) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));
		if (max === r) h = ((g - b) / delta) % 6;
		else if (max === g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s, l };
}

function toDarkGradientColor(color: Pick<ColorSample, "r" | "g" | "b">) {
	const { h, s, l } = rgbToHsl(color);
	const adjustedSaturation = Math.max(0.24, Math.min(0.78, s));
	const adjustedLightness = Math.max(0.17, Math.min(0.4, l * 0.58));
	const chroma = (1 - Math.abs(2 * adjustedLightness - 1)) * adjustedSaturation;
	const section = h / 60;
	const x = chroma * (1 - Math.abs((section % 2) - 1));
	let rgb: [number, number, number];
	if (section < 1) rgb = [chroma, x, 0];
	else if (section < 2) rgb = [x, chroma, 0];
	else if (section < 3) rgb = [0, chroma, x];
	else if (section < 4) rgb = [0, x, chroma];
	else if (section < 5) rgb = [x, 0, chroma];
	else rgb = [chroma, 0, x];
	const match = adjustedLightness - chroma / 2;
	return `#${rgb.map((value) => Math.round((value + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}
