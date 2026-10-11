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
            "<!doctype html><html><body style='margin:0;padding:32px 16px;"
            "background-color:#f4f1eb;font-family:Arial,Helvetica,sans-serif;color:#252b3a;'>"
            "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' "
            "style='max-width:600px;margin:0 auto;background:#fff;border-radius:16px;'>"
            "<tr><td style='padding:36px 32px;text-align:center;'>"
            "<p style='margin:0 0 12px;color:#7465a8;font-size:12px;letter-spacing:2px;"
            "text-transform:uppercase;'>Nalanyinyun's Library</p>"
            "<h1 style='margin:0;color:#252b3a;font-size:24px;'>本期暂无新内容</h1>"
            "<p style='margin:16px 0 0;color:#687080;font-size:15px;line-height:1.7;'>"
            "图书馆有新内容时，我们会再给你发送通知。</p>"
            "</td></tr></table></body></html>"
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
  <body style="margin:0;padding:32px 16px;background-color:#f4f1eb;font-family:Arial,Helvetica,sans-serif;color:#252b3a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;">
      <tr><td style="padding:0 0 18px;text-align:center;">
        <p style="margin:0;color:#7465a8;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Nalanyinyun's Library</p>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e8e4dc;border-radius:16px;overflow:hidden;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="height:6px;background:#7465a8;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:32px 32px 12px;">
            <p style="margin:0 0 12px;color:#7465a8;font-size:12px;font-weight:700;letter-spacing:1px;">图书馆更新</p>
            <h1 style="margin:0;color:#252b3a;font-size:26px;line-height:1.35;font-weight:700;">{title}</h1>
            <p style="margin:14px 0 0;color:#7b8190;font-size:13px;line-height:1.5;">{pubDate}</p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;">
            <div style="border-top:1px solid #eeeae4;padding-top:20px;color:#4f5665;font-size:15px;line-height:1.8;overflow-wrap:anywhere;">{description}</div>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
              <tr><td style="border-radius:8px;background:#7465a8;">
                <a href="{link}" style="display:inline-block;padding:12px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">阅读全文&nbsp; →</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 12px 0;text-align:center;color:#858998;font-size:12px;line-height:1.7;">
        <p style="margin:0 0 6px;">感谢订阅 Nalanyinyun's Library 更新通知</p>
        <p style="margin:0;">不想再收到邮件？<a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#7465a8;text-decoration:underline;">点击此处退订</a></p>
      </td></tr>
    </table>
  </body>
</html>"""


def publishLatest(apiKey, segmentID, fromID, subject, content):
    resend.api_key = apiKey
    resend.Broadcasts.create({
        "segment_id": segmentID,
        "from": fromID,
        "subject": subject,
        "html": content,
        "send": False
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
