import html
import requests
import xml.etree.ElementTree as ET
import resend
import os

def judgemnent():
    response = requests.get("https://nalanyinyun.work/.noupdate", timeout=15)
    if response.status_code == 200:
        print("Shirai Kuroko: No update needed. Exiting.")
        exit(0)
    else:
        print("Shirai Kuroko: Update needed. Proceeding with the update.")


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
        return (
            "<!doctype html><html lang='zh-CN'><body style='margin:0;padding:24px;"
            "font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.7;'>"
            "<p style='margin:0 0 16px;'>Nalanyinyun's Library 已更新：</p>"
            "<p style='margin:0 0 20px;'>本期暂无新内容。</p>"
            "<p style='margin:0;color:#666;font-size:12px;'>"
            "不想再收到邮件？<a href='{{{{{RESEND_UNSUBSCRIBE_URL}}}}}' "
            "style='color:#555;'>点击此处退订</a></p></body></html>"
        )

    first = items[0]
    title = html.escape(first.findtext("title", default="Untitled"))
    description = html.escape(first.findtext("description", default="No description.")).replace(
        "\n", "<br>"
    )
    pubDate = html.escape(first.findtext("pubDate", default="Unknown date"))
    link = first.findtext("link", default="https://nalanyinyun.work/")
    if not link.startswith(("https://", "http://")):
        link = "https://nalanyinyun.work/"
    link = html.escape(link, quote=True)

    return f"""<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.7;">
    <div style="max-width:600px;margin:0 auto;">
      <p style="margin:0 0 20px;">Nalanyinyun's Library 已更新，以下是摘要：</p>
      <p style="margin:0 0 8px;"><strong>标题：</strong>{title}</p>
      <p style="margin:0 0 16px;color:#666;"><strong>日期：</strong>{pubDate}</p>
      <hr style="height:0;border:0;border-top:1px solid #ddd;margin:0 0 16px;">
      <div style="margin:0 0 16px;white-space:normal;overflow-wrap:anywhere;">{description}</div>
      <p style="margin:0 0 24px;"><a href="{link}" style="color:#333;">阅读全文</a></p>
      <p style="margin:0;color:#666;font-size:12px;">退订见：
        <a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#555;">点击此处退订</a>
      </p>
    </div>
  </body>
</html>"""


def publishLatest(apiKey, segmentID, fromID, subject, content):
    resend.api_key = apiKey
    resend.Broadcasts.create({
        "segment_id": segmentID,
        "from": fromID,
        "subject": subject,
        "html": content,
        "send": True
    })

judgemnent()
url = "https://nalanyinyun.work/rss.xml" 
content = generateEmailContent(getRss(url))

publishLatest(
    apiKey = os.getenv("RESEND_API_KEY"),
    segmentID="76654bf7-fd97-45e9-81a6-e38cda6391fc",
    fromID="Nalanyinyun <nalanyinyun@nalanyinyun.work>",
    subject="Nalanyinyun's Library Content Delivered",
    content=content
)
