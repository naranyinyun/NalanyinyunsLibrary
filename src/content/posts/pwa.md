---
title: 为 Astro 站点添加 PWA 支持
published: 2026-03-26
description: "利用 vite-pwa 插件为 Astro 站点添加 PWA 支持，提升访问体验。"
tags: [blog]
category: 技术
draft: false
---

## 起因

我的网站现在是 Astro + Fuwari 搭建的，它部署在 Vercel 上。Vercel 对 Astro 的支持非常好，部署 Astro 是完全零配置的。它的 Git 集成也非常强大，Vercel GitHub Apps 也可以自动为其他分支生成预览环境部署......

这些功能都非常好，但是有一个问题就是，Vercel CDN 在中国大陆并没有节点。虽然它的 TTFB 平均值只有 3 ms，但这并不代表实际体验有多好。加载 HTML 和 JavaScript 尚且都很慢，更别提图片了。虽然首次访问无法优化（受限于 CDN），但可以通过缓存策略优化后续访问。

## 实现

顺着这种思路，我很自然的想到了 Service Worker，一段 JavaScript 代码就可以做到缓存内容，离线访问之类的功能。它可以把网站非首次访问的 FCP 压缩到 0.6 s 左右。

你可以点击 F12 转到 Application 选项，你会发现这个网站在你访问的时候大概缓存了 5.5 mb
数据，现在你可以试试点击其它页面或者断网试试，效果应该会非常好。

既然有了 Service Worker，顺便把 PWA 也做好让网站可以安装成原生应用，这对体验来说也是一次不小的飞跃。

## 方案：@vite-pwa/astro

### 安装依赖（构建时）

vite-pwa 的 [Astro 集成](https://github.com/vite-pwa/astro) 基本是开箱即用的，它们自己说的是零配置。不太清楚什么是零配置，虽然配置简单，但也是需要一些配置。

它也是利用 Workbox 提供 PWA 支持的，所以熟悉的那些 Service Worker 功能都是可以用的。

```bash
pnpm add @vite-pwa/astro -D
```

### 配置

在 `astro.config.mjs` 中引入 vite-pwa：

```javascript
import AstroPWA from "@vite-pwa/astro";
```

引入集成。这是我的配置，如果你想参考：

```javascript
AstroPWA({
  registerType: "autoUpdate",
  manifest: {
    id: "/",
    name: "Nalanyinyun's Library",
    short_name: "NaLib",
    description: "Nalanyinyun's Library",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "any",
    start_url: "/",
    icons: [
      {
        src: "/favicon/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/favicon/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  },
  workbox: {
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: "/offline",
    globPatterns: ["**/*.{js,css,html,png,jpg,webp,woff2}"]
  }
})
```

这样就基本达到预期目的了，可能需要注意 `globPatterns` 字段，如果你频繁更新内容，缓存 html 也许不是个好做法，可以去掉。

> [!WARNING]
> vite-pwa 似乎提供了通过虚拟模块加载 sw.js 的方式，但是我在实际测试中并没成功。所以下面的内容是一种不太严谨的做法，仅供参考。

### 声明 manifest.webmanifest

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#ffffff" />
```

最好在 `<head>` 中声明。

### 注册 Service Worker

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

即便是手动声明，也可以借助浏览器自带的生命周期管理来管理 sw.js，在默认情况下，网页每次被打开就会刷新一次内容。

## 测试

运行 Astro 测试服务器的时候，并不会启用 PWA 功能。测试的时候需要先构建产物，再进行 `preview`。