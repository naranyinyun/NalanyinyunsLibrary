---
title: Wiki.js - 全世界最好的 WIki 引擎，有多好？
published: 2026-03-29
description: "通过 GCP 和 Cloudflare 部署 Wiki.js, 以及我自己的一些体验"
tags: [linux, web]
category: 技术
draft: false
---

## 为什么是 Wiki.js？

市面上的 Wiki 引擎实在算不上少，但能入眼的并不多。MediaWiki 对于小项目来说“杀鸡用牛刀”，Dokuwiki 实在是太难看，TiddlyWiki？它更像是一种笔记整理软件，而非真正的 Wiki 引擎，而且他们的官网我就没能打开过。

> **The most powerful and**
> **extensible open source Wiki software**

我觉得很少有软件会上来就这么说，但这就是 Wiki.js 的 slogan. 既然它敢这么说，那肯定有它自己的理由。除去它自己的宣传，吸引我的还有几点：

- 支持 Markdown 和 WYSIWYG 编辑器
- 开箱即用，包括用户管理，内置搜索，Web Analytics 等等
- 基于 Node.js，实际测试上性能不错
- 可以自动从 Git 集成抓取内容生成页面
- UI 好看

至于最吸引我的，还是 UI 好看这点，虽然我也没觉得有多好看，但至少比 MediaWiki 云云好多了。

但 Wiki.js 也不是十全十美，它们因为社区问题搁置 3.0 版本很久了，不过现在的 2.0 也不是不能用。

## 部署：Docker Compose

下面只提供 Docker Compose 的部署方式，如果你用 Ubuntu LTS，可以参考 [Ubuntu LTS](https://docs.requarks.io/install/ubuntu) 专门的教程。

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine          
    environment:
      POSTGRES_DB: wiki
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: wikijsrocks    # 改密码，改密码，改密码，重要的事情说三遍
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data
    logging:
      driver: none

  wiki:
    image: ghcr.io/requarks/wiki:2
    depends_on:
      - db
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: wikijsrocks
      DB_NAME: wiki
    restart: unless-stopped
    ports:                  
        - 80:3000
volumes:
  db-data:
```

这是 Wiki.js 官方提供的 Docker Compose 配置，基本上是开箱即用的。你只需要把它放在一个目录下，运行 `docker compose up -d` 就可以了。

如果你需要修改这些环境变量，参考[官方文档](https://docs.requarks.io/install/docker)。

## 暴露服务

### Nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name  wiki.example.com; 

    return 301 https://$host$request_uri;
}


server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name  wiki.example.com;


    ssl_certificate      /etc/nginx/ssl/wikijs.pem; # 申请证书
    ssl_certificate_key  /etc/nginx/ssl/wikijs.key; # 申请证书


    ssl_session_cache    shared:SSL:10m;
    ssl_session_timeout  10m;

    location / {
        proxy_pass http://127.0.0.1:3000; 
        

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;


        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        client_max_body_size 50m;
    }
}
```

不过说实话，如果你的服务器不在国内，我不是很推荐直接用 Nginx 反向代理。我自己使用的是下面的方案。

### Cloudflare Tunnel

通过 Cloudflare Zero Trust 的 Tunnel, 可以直接将本地的服务通过 Cloudflare 网络暴露到公网。Cloudflare 会自动终结 SSL, https 这些事情都不需要操心，而且可以利用 Cloudflare 边缘网络的各种功能。

从本质上来说，Cloudflare Tunnel 是内网穿透服务，所以不需要给服务器分配公网 IP,  也不需要配置任何的入站规则。这也是个安全性上，小小的默认优势。

我用的是 GCP, 可以直接用 IAP 隧道连接到 VM, 如果你的提供商没有类似的功能，用 Tunnel 来管理 SSH 也是个更安全的选择。

当然，如果你不信任 Cloudflare 或者需要 Nginx 精细控制，这可能不是个好办法。

修改上面的 Docker Compose, 改成大概这样：

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine        
    environment:
      POSTGRES_DB: wiki
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: wikijsrocks    # 改密码，改密码，改密码，重要的事情说三遍
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data
    logging:
      driver: none

  wiki:
    image: ghcr.io/requarks/wiki:2
    depends_on:
      - db
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: wikijsrocks
      DB_NAME: wiki
    restart: unless-stopped
    # ports:               # 取消端口映射，Cloudflare Tunnel 会直接连接到容器内部的 3000 端口
    #   - "80:3000"

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token YOUR_TUNNEL_TOKEN_HERE
    depends_on:
      - wiki

volumes:
  db-data:
```

## 使用体验

Wiki.js 给我的第一印象就是性能很不错，我只选了一个 e2-medium 实例，就能流畅的使用 Wiki.js 的各种功能，我不太清楚用户规模扩大之后它的表现怎么样，毕竟我也没有测试的机会。

它基本拥有所有你需要的功能，我不想具体罗列，你可以去官网看，或者直接上手体验一下。作为一个参考，我觉的少数派上 [这篇文章](https://sspai.com/post/78945) 写的很全。

它的 UI 也还不错，虽然不算特别好看，有一点 Material Design 的感觉，但是这个图标是真难看。

我倒是没有找到它们的 Demo, 如果你想大概看看 Wiki.js 到底长啥样，可以去 [我的 WIki](https://wiki.nalanyinyun.work) 看看。

