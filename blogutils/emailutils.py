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