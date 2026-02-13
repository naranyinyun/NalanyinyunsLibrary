---
title: Archlinux 安装指南
published: 2025-02-13
tags: [linux]
category: 技术
draft: true
---

# Archlinux 安装指南

这篇文章会介绍如何安装 Archlinux，以及一些常用的配置方法。

## 准备工作

### 制作启动盘

从 Archlinux 官网下载*最新的* [Archlinux ISO](https://archlinux.org/download/) 镜像文件，核对校验和。

如果下载速度缓慢，可以从位于境内的镜像站下载，比如 [阿里云镜像站](https://mirrors.aliyun.com/archlinux/iso/)。从 Magnet 链接下载也是个好选择。

推荐使用 [Ventoy](https://www.ventoy.net/) 制作启动盘，如果使用 `Ventoy`，请选择 `UEFI` 模式。在使用启动盘时，选择 `grub` 模式启动。

### UEFI 设置

重启进入 UEFI 固件设置，关闭安全启动和 CSM。如果你需要配置安全启动，也在这里暂时关闭，archlinux ISO 没有签名。

> [!TIP]
> Windows 按住 `Shift` 键点击重启进入高级启动模式，可以直接进入 UEFI 固件设置，在一些启用了快速启动的设备上非常有用。


如果需要，可以调整启动顺序，将 USB 设备设置为第一启动项。

## 安装 Archlinux

进入 Archlinux ISO.

### 连接网络

在大多数使用有线连接的电脑上，网络开箱即用。在一些使用无线连接的电脑上，可以使用 `iwctl` 连接无线网络。

首先确认系统识别到了网络接口：

``` bash
ip link
```

确认网卡没有被 `rfkill`

``` bash
rfkill list
rfkill unblock all # 如果被阻止，解除阻止，可以指定设备，不用 all
```

进入 `iwctl` 交互式命令行：

``` bash
iwctl
device list # 列出无线设备
station [device name] scan
station [device name] get-networks
station [device name] connect [SSID]
```

### 系统时间

``` bash
timedatectl set-ntp true
```

检查 `timedatectl` 的输出，确保系统时间正确。

> [!TIP]
> 在 Windows 上以管理员身份执行 `reg add "HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\TimeZoneInformation" /v RealTimeIsUniversal /d 1 /t REG_DWORD /f` 可以让 Windows 使用 UTC 时间。

## 分区和格式化

由于不同设备的硬盘使用情况不同，这里不做具体介绍。不过，大致的分区方案如下：

- EFI 系统分区（ESP）推荐大小 1GB，我推荐 4GB。格式化为 FAT32
- 根分区 `/`  至少 20GB, 推荐 60GB, 格式化为 btrfs
- SWAP 是可选的，通常至少有 4GB，不过你也可以用 swapfile 替代，它更灵活，在安装系统后配置。格式化为 swap

如果你的 EFI 由 Windows 创建，512MB 的大小通常不够，请扩大到至少 1GB。

> [!WARNING]
> 双系统用户*不要格式化 EFI*，这会使你的其他系统无法引导

## 安装基础系统