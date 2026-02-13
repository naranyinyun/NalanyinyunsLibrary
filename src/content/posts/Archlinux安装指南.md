---
title: Archlinux 安装指南
published: 2025-02-13
tags: [linux]
category: 技术
draft: false
---

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

``` shell
ip link
```

确认网卡没有被 `rfkill`

``` shell
rfkill list
rfkill unblock all # 如果被阻止，解除阻止，可以指定设备，不用 all
```

进入 `iwctl` 交互式命令行：

``` shell
iwctl
device list # 列出无线设备
station [device name] scan
station [device name] get-networks
station [device name] connect [SSID]
```

### 系统时间

``` shell
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

如果你需要创建 btrfs 子卷，可以参考下面的命令：

``` shell
mount -t btrfs -o compress=zstd /dev/sdxn /mnt
btrfs subvolume create /mnt/@
btrfs subvolume create /mnt/@home
```

> [!IMPORTANT]
> `timemshift` 以及很多 `btrfs` 快照工具都需要这种子卷布局，如果你计划使用这类工具，不要创建 `@.snapshots` .

## 安装基础系统

### 挂载分区

挂载分区：

``` shell
mount -t btrfs -o subvol=/@,compress=zstd /dev/sdxn /mnt # 根分区
mount -t btrfs -o subvol=/@home,compress=zstd /dev/sdxn /mnt/home # home 分区
mount /dev/sdxn /mnt/boot # EFI 分区
```

按顺序挂载，如果提示没有挂载点，创建它：

``` shell
mkdir -p [mount point]
```

### 安装基础包

使用 `pacstrap` 安装基础包：

``` shell
pacstrap /mnt base linux linux-firmware btrfs-progs nano
```

如果你想用其它内核，可以现在就替换。`linux-firmware` 已经被拆分，你可以定制安装。通常来说 `linux-firmware-whence` 是必须的，其它诸如 `linux-firmware-amdgpu` 可以根据需要安装。

### 生成 fstab

生成 `fstab` 文件：

``` shell
genfstab -U /mnt >> /mnt/etc/fstab
```

### 切换根目录

切换到新安装的系统：

``` shell
arch-chroot /mnt
```

### 设置时区

设置时区：

``` shell
ln -sf /usr/share/zoneinfo/Region/City /etc/localtime
hwclock --systohc
```

### 本地化设置
编辑 `/etc/locale.gen`，取消需要的语言的注释，你通常需要它们两个：

``` plain
en_US.UTF-8 UTF-8
zh_CN.UTF-8 UTF-8
```

生成语言环境：

``` shell
locale-gen
```

创建 `/etc/locale.conf` 文件，添加以下内容：

``` plain
LANG=en_US.UTF-8
```

> [!WARNING]
> 不要在这里设置中文 locale

### 设置密码和添加用户

设置 root 密码：

``` shell
passwd
```

添加新用户：

``` shell
useradd -m -G wheel -s /bin/bash username
passwd username
```

> [!NOTE]
> 出于一些个人经验，我不推荐创建 `homectl` 用户。从错误中恢复 `homectl` 用户非常困难，`systemd` 也承认它有缺陷。 `homectl` 用户没有默认的 UID 和 GID。

### 安装引导加载程序

大多数教程会推荐你用 `grub`，但我更推荐 `systemd-boot`。没有什么原因，但是 `systemd` 已经提供了，为什么不用呢？

安装 `systemd-boot`：

``` shell
bootctl install
```

创建引导项：

``` shell
nano /boot/loader/entries/arch.conf
```

在文件中添加以下内容：

``` plain
title   Arch Linux
linux   /vmlinuz-linux
initrd  /initramfs-linux.img
options root=PARTUUID=[UUID] rw
```

UUID 通常可以使用 `blkid` 获取。

## 完成安装
退出 `chroot` 环境：

``` shell
exit
```

卸载分区：

``` shell
umount -R /mnt
```

重启系统：

``` shell
reboot
```

移除安装介质。

## 一些后续配置

### 网络配置

我通常用 `systemd-networkd` 和 `systemd-resolved` 来配置网络。只需要启用这两个服务就可以了：

``` shell
systemctl enable systemd-networkd
systemctl enable systemd-resolved
```

创建网络配置文件 `/etc/systemd/network/20-wired.network`：

``` plain
[Match]
Name=[DEVICE NAME]
[Network]
DHCP=yes
``` 

链接 `resolv.conf`：

``` shell
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

### 安装 sudo

``` shell
pacman -S sudo
```

编辑 `/etc/sudoers` 文件，取消注释 `wheel` 用户组的权限：

``` shell
nano /etc/sudoers
```

找到并取消注释以下行：

``` plain
%wheel ALL=(ALL:ALL) ALL
```

如果你没装 `sudo`, 也可以用 `systemd` 的 `run0`，在体验上没有太大区别。

`run0` 开箱即用。

### DE/WM

大多数教程会推荐 KDE Plasma, 不过我更喜欢 Hyprland. 

当然我是照搬别人的 dotfiles, 如果你也想用，可以看看 [End4](https://ii.clsty.link/)

### 主机名

谁不喜欢 `systemd` 呢？我们用 `hostnamectl` 设置主机名：

``` shell
hostnamectl set-hostname myarchlinux
```

