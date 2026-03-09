---
title: 利用 Resend 和 Workers 零成本实现电子邮件订阅
published: 2026-03-10
tags: [blog]
category: 技术
draft: false
---

# 起因

虽然没什么人看，但我突发奇想想要给博客加上一个电子邮件订阅系统。

最开始的想法是利用网站已有的 RSS 进行转换，因为我不怎么了解 Resend，最开始就想要找一个全自动的托管平台。

但问题就是，类似于 Mailer 这样的服务免费额度确实很大，但我们想要的最核心的功能 `RSS to Email` 却是收费的，那要这么大的免费额度干什么呢？

正好了解过 Resend ，干脆就自己手搓一个吧。

# 构思设计

Resend 功能虽然强大，但它只有发件和管理订阅者的功能，并不是一种我们想要的托管平台。想以 Resend 为核心构建系统，还缺少以下组件：

- 一个表单，用于收集订阅用户的邮箱
- 转换 RSS 到电子邮件的实现
- 调用 Resend API 发送邮件的服务
- 负责添加订阅用户的服务

因为我的博客本身是完全静态的，我不想在博客内部引入任何无服务器函数。为了系统的可扩展性和可维护性考虑，每个服务之间和每个服务与博客之间应该没有任何关联。最终，我的方案如下：

- Tally 作为 Web 表单，通过 Webhook 发送信息
- 写一个 Python 脚本处理 RSS 转换和邮件发送
- Cloudflare Workers 充当 Webhook endpoint，调用 API 向 Resend 添加订阅者
- 事件驱动的 GitHub Action 运行 Python脚本

# 系统实现

## Resend

这里利用了 Resend 的 [Broadcasts](https://resend.com/docs/api-reference/broadcasts/create-broadcast) 功能。

在注册 Resend 并添加域名后，记得添加一个 API Key，这个需要保留好，后面会用到。

同时管理订阅者也是利用了 Resend Audience 功能里的 Segment 功能实现的，下文会提到。

通过 Broadcasts API 的 Create Broadcasts 进行邮件的创建和批量发送。它的 Python API 大概长这样：

```python
import resend

resend.api_key = "re_xxxxxxxxx"

// Create a draft broadcast
params: resend.Broadcasts.CreateParams = {
  "segment_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "from": "Acme <onboarding@resend.dev>",
  "subject": "Hello, world!",
  "html": "Hi {{{FIRST_NAME|there}}}, you can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}",
}
resend.Broadcasts.create(params)

// Create and send immediately
params: resend.Broadcasts.CreateParams = {
  "segment_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "from": "Acme <onboarding@resend.dev>",
  "subject": "Hello, world!",
  "html": "Hi {{{FIRST_NAME|there}}}, you can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}",
  "send": true,
}
resend.Broadcasts.create(params)

// Create and schedule
params: resend.Broadcasts.CreateParams = {
  "segment_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "from": "Acme <onboarding@resend.dev>",
  "subject": "Hello, world!",
  "html": "Hi {{{FIRST_NAME|there}}}, you can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}",
  "send": true,
  "scheduled_at": "in 1 hour",
}
resend.Broadcasts.create(params)
```

其实没这么复杂，关键的字段并不多。我的实现会在下文的 Python 脚本给出以供参考。

## Python 脚本

Python 脚本需要做的事情大概有三件：
1. 提取 RSS 的第一个 Item 
2. 编写电子邮件内容
3. 通过 Resend Broadcasts API 发送

```python
import html
import requests
import xml.etree.ElementTree as ET
import resend
import os


def getRss(url):
    headers = {
        "User-Agent": "Nalanyinyun RSS and email service/1.0, +https://nalanyinyun.work"
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    return response.text

def generateEmailContent(rss):
    root = ET.fromstring(rss)
    items = root.findall("./channel/item")
    if not items:
        return "No posts found in RSS feed."

    first = items[0]
    title = first.findtext("title", default="Untitled")
    description = first.findtext("description", default="No description.")
    pubDate = first.findtext("pubDate", default="Unknown date")
    formatted_str = (
        f"<pre style='white-space: pre-wrap; font-family: sans-serif; font-size: 14px;'>"
        f"Nalanyinyun's Library 已更新，以下是摘要：\n\n"
        f"Title: {title}\n"
        f"Date: {pubDate}\n"
        f"{'-'*20}\n"
        f"Description: {description}\n\n"
        f"退订见：<a href=\"{{{{{{ resend_unsubscribe_url }}}}}}\">点击此处退订</a>"
        f"</pre>"
    )
    return formatted_str


def publishLatest(apiKey, segmentID, fromID, subject, content):
    resend.api_key = apiKey
    resend.Broadcasts.create({
        "segment_id": segmentID,
        "from": fromID,
        "subject": subject,
        "html": content,
        "headers": {
            "List-Unsubscribe": "<{{{{ resend_unsubscribe_url }}}}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        },
        "send": True
    })


url = "https://nalanyinyun.work/rss.xml" 
content = generateEmailContent(getRss(url))

publishLatest(
    apiKey = os.getenv("RESEND_API_KEY"),
    segmentID="76654bf7-fd97-45e9-81a6-e38cda6391fc",
    fromID="Nalanyinyun <nalanyinyun@nalanyinyun.work>",
    subject="Nalanyinyun's Library Content Delivered",
    content=content
)
```

在使用时，替换 `url` 和 `apiKey`、`segmentID` 之类的变量就可以了。小心别把机密信息硬编码进去了。

值得注意的是，Resend 已经替我们处理好了所有的退订逻辑，但请在的正文和 Headers 里标识出来，不然很可能第一次发邮件就被拒信了。

## Tally

Tally 的 Web 表单是开箱即用的，[我的表单](https://tally.so/r/D41zvq)只有这么一个输入框。在编辑之后点击 Integrities，添加一个 Webhook endpoint 就可以了。

Webhook endpoint 的实现下文会提到。

Tally 的自定义域名需要付费计划，不过我觉得这个是不是自己的域名应该无关紧要。记得在设置里开启禁止重复填写。

## Cloudflare Workers

Resend [Audience](https://resend.com/docs/dashboard/segments/introduction)。这个只需要创建好 Segment 并记住 ID 就可以了。

Cloudflare Workers 主要负责解析 Webhook 传入的数据，因为我实在是不懂 JavaScript，所以找 Gemini 生成一个勉强能用的后端。

``` javascript
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const emailField = body.data.fields.find(f => f.type === "INPUT_EMAIL");
      const userEmail = emailField ? emailField.value : null;

      if (!userEmail) {
        return new Response("No email found in webhook data", { status: 400 });
      }

      const segmentId = env.RESEND_SEGMENT_ID; 
      const url = `https://api.resend.com/segments/${segmentId}/contacts`;

      const resendResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const result = await resendResponse.json();

      if (resendResponse.ok) {
        console.log(`Success: Added ${userEmail} to segment`);
        return new Response("Subscribed to segment successfully!", { status: 200 });
      } else {
        console.error("Resend API Error:", result);
        return new Response(JSON.stringify(result), { status: resendResponse.status });
      }

    } catch (err) {
      return new Response("Internal Server Error: " + err.message, { status: 500 });
    }
  },
};
```

使用时需要添加机密 `RESEND_API_KEY` 和 ‘RESEND_SEGMENT_ID’。

如果你的 Tally Webhook 传入和我的不一样，可能需要稍微改一改解析的逻辑，调用 API 那部分应该是没有问题的。

## GitHub Action

这部分就很简单了，只要监听相关文件变化再执行 Python 脚本就可以了，大概长这样。

```yaml
name: RSS to Email on File Change

on:
  push:
    branches:
      - main
    paths:
      - src/content/posts/**
  workflow_dispatch:

jobs:
  email_notification:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install Dependencies
        run: pip install requests resend

      - name: Run Script
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
        run: python blogutils/emailutils.py
```

使用时需要添加机密 `RESEND_API_KEY`。

## 一起用

把这些东西黏在一起之后，只需要把 Tally 表单链接贴在需要的地方就可以了。

# 一些碎碎念

很多教程在手搓的时候会推荐你直接写一个 Serverless 函数放在博客里面去处理表单逻辑，这个方式我觉得不是很优雅。一个是因为它破坏了我网站完全静态的属性，一个是手搓 HTML 这件事本身就没什么必要。

本站的所有源码以及上述的文件都可以在仓库中获取，如果你觉得对你有帮助，谢谢 star 啦。

::github{repo="naranyinyun/NalanyinyunsLibrary"}




