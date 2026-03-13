/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}",
    "./src/styles/vendor/markdown.css",
  ],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  safelist: [
    "copy-btn",
    "copy-btn-icon",
    "success-icon",
    "line",
    "expressive-code",
    "anchor",
    "anchor-icon",
  ],
};