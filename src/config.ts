import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Nalanyinyun's Library",
	subtitle: "纳兰音韵的大图书馆",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 190, // Default hue for the theme color (fallback when monet is disabled), from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
		monet: {
			enable: true, // Automatically generate site color scheme from the banner image using Monet (Material You)
			variant: "fidelity", // 'fidelity' | 'content' | 'tonalSpot' | 'vibrant' | 'expressive' | 'neutral' | 'monochrome' | 'rainbow' | 'fruitSalad'
			contrastLevel: 0, // Contrast level from -1 (minimum) to 1 (maximum), 0 is standard
		},
	},
	banner: {
		enable: true,
		src: "assets/images/145209167.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "top", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: true, // Display the credit text of the banner image
			text: "姫崎莉波✖️Vino", // Credit text to be displayed
			url: "https://www.pixiv.net/artworks/145209167.png", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{
			src: "/favicon/91950505.png",
		},
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Notes,
		LinkPreset.About,
		{ name: "Presenting NOW", url: "/presenting-now/" },
		LinkPreset.LinkExchange,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/91950505.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Nalanyinyun",
	bio: "日傘を差した物静かな天然素材",
	author: "Nalanyinyun", // Default author for posts
	links: [
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/384920476",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/naranyinyun",
		},
		{
			name: "Matters",
			icon: "fa6-solid:pen",
			url: "https://matters.town/@nalanyinyun",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
