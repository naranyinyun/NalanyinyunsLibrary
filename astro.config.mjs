import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { slug as githubSlug } from "github-slugger";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import indexnow from "astro-indexnow";
import pagefind from "astro-pagefind";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";

const POST_CACHE_LIMIT = 5;
const postDirectory = new URL("./src/content/posts/", import.meta.url);

function getLatestPostCachePaths() {
	const posts = [];
	const files = readdirSync(postDirectory, { recursive: true, withFileTypes: true });

	for (const file of files) {
		if (!file.isFile() || !/\.mdx?$/.test(file.name)) continue;

		const filePath = path.join(file.parentPath, file.name);
		const frontmatter = readFileSync(filePath, "utf8");
		const published = frontmatter.match(/^published:\s*["']?([^\n"']+)/m)?.[1];
		const isDraft = /^draft:\s*true\s*$/m.test(frontmatter);
		if (!published || isDraft) continue;

		const rawSlug = path
			.relative(postDirectory.pathname, filePath)
			.replace(/\\/g, "/")
			.replace(/\.mdx?$/, "");
		const slug = rawSlug.split("/").map(githubSlug).join("/");
		posts.push({ slug, published: new Date(published) });
	}

	return new Set(
		posts
			.sort((a, b) => b.published.getTime() - a.published.getTime())
			.slice(0, POST_CACHE_LIMIT)
			.map(({ slug }) => `posts/${slug}/index.html`),
	);
}

const latestPostCachePaths = getLatestPostCachePaths();

// https://astro.build/config
export default defineConfig({
	site: "https://nalanyinyun.work/",
	base: "/",
	trailingSlash: "always",

	integrations: [
		AstroPWA({
			// Astro renders pages after Vite's HTML transform, so Layout.astro owns registration.
			injectRegister: false,
			registerType: "autoUpdate",
			manifest: {
				id: "/",
				name: "Nalanyinyun's Library",
				short_name: "Nalanyinyun's Library",
				description: "纳兰音韵的大图书馆",
				lang: "zh-CN",
				start_url: "/",
				scope: "/",
				display: "standalone",
				background_color: "#ffffff",
				theme_color: "#ffffff",
				icons: [
					{
						src: "/favicon/192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/favicon/512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
			workbox: {
				// Images are always fetched from the network; only the five newest posts
				// are included in the offline precache.
				globPatterns: [
					"**/*.{css,html,ico,js,json,ttf,txt,webmanifest,woff,woff2,xml}",
				],
				manifestTransforms: [
					async (entries) => ({
						manifest: entries.filter((entry) => {
							const entryPath = decodeURI(entry.url).replace(/^\//, "");
							return !entryPath.startsWith("posts/") || latestPostCachePaths.has(entryPath);
						}),
						warnings: [],
					}),
				],
				maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
			},
		}),
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"preprocess: vitePreprocess(),": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
		svelte(),
		sitemap(),
		pagefind(),
		indexnow({
			key: "d9ff093cdc1e407c8efa2b0a28a38fad",
		}),
	],

	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},

	vite: {
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},

	adapter: vercel(),
});
