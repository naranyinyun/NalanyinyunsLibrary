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
	subtitle: "Collections of artworks and blogs",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 35, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/119683453_p2.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "top", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [LinkPreset.Home, LinkPreset.About],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/91950505.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Nalanyinyun",
	bio: "日傘を差した物静かな天然素材 ",
	links: [
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://space.bilibili.com/384920476",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/naranyinyun",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "Nalanyinyun's Library Content License",
	url: "https://github.com/naranyinyun/NalanyinyunsLibrary/blob/main/NLGL/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
