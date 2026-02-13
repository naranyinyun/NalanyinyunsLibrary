---
title: 为 CR6608 刷入 Openwrt
published: 2025-02-10
description: "本文将介绍如何为 CR6608 刷入 Openwrt，以及一些常见的问题和解决方法。"
tags: [openwrt]
category: 技术
draft: false
---
# 为 CR6608 刷入 Openwrt

### 准备

1. Openwrt 固件
2. 一台 CR6608


### 获取 SSH

使用 [xmir_patcher](https://github.com/openwrt-xiaomi/xmir-patcher) 开启 ssh 即可。

使用方法也非常简单，用网线将电脑连接到 CR6608，打开 `run.bat` 按照提示修改路由器配置就可以等着了，大概需要 3-5 分钟，完成后会提示你路由器的 IP 地址和 SSH 密码。

> [!TIP]
> 网上比较老的教程会要求用已经刷入 Openwrt 的路由器开启 SSH，但现在的 xmir_patcher 已经不需要了。

### 刷入 pb-boot

通过 SSH 连接 CR6608

``` shell
ssh root@[CR6608 IP]
```

密码即为路由器管理密码

下载 [pb-boot](https://gsg2rtttmkjb.sg.larksuite.com/file/Xd3DbJDgeoAgQHxktbclfaRdgnz?from=from_copylink) 的链接

``` shell
scp -O [pb-boot path] root@[CR6608 IP]:/tmp
ssh root@[CR6608 IP]
mtd write /tmp/pb-boot.img Bootloader
```

### 刷入 Openwrt

如果一切正常，断开路由器电源，然后按住 `reset` 并插入电源，直到路由器面板灯呈呼吸灯状

可能需要在 Windows 设置中切换 IP 为静态，将网关设置为 192.168.1.1, 并为自己的电脑分配一个 192.168.1.x 的 IP 地址

打开 192.168.1.1 , 选择恢复固件，你可以刷入 `Kernel` 进行安装，也可以直接安装 `Factory` 固件

如果你刷入 `Kernel` 镜像，进入后选择`系统`>`备份与升级`>`刷写新的固件`

如果你看见了 Openwrt 关于设备不匹配或者版本不兼容的警告，在你确认固件无误的情况下，可以选择强制刷入，在一些旧版的固件刷入 snapshot 版本时可能会遇到这个问题

> [!WARNING]
> 你可能会在主线 Openwrt 稳定版上遇到 ssh 连接的问题，可以切换到 snapshot 或者换成 Immortalwrt

