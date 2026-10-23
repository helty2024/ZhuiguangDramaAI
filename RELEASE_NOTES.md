# 追光影视 Windows 安装包 — 第一版（GitHub Release 候选）

- 产品版本（package.json）: 4.0.8
- GitHub 建议 tag: v1.0.0 或 v4.0.8-patched-20261023
- 构建时间（Asia/Shanghai）: 2026-10-23 10:37
- 产物: ZhuiguangDramaAI-4.0.8-Win10-11-x64-Setup.exe
- 大小: 139935619 bytes (~133.5 MB)
- SHA256: ca88a282de21724123b63c267a43e797363a3372726f19749c94dff94c6b9548
- 构建命令: python installer_build/build_installer.py
- 构建工具: NSIS 3.13（installer_build/tools/nsis-3.13）
- 源目录: outputs/ZhuiguangDramaAI（现场已打补丁目录）

## 本包包含的补丁（相对 2026-10-20 旧 Setup）
- uncertain / 禁叠单 / 超时相关逻辑
- 参考图压缩
- 原生模块正确 unpack（app.asar ~30.8MB + app.asar.unpacked 含 better-sqlite3 / sharp-win32-x64）
- 未打入 bak-broken-packed-natives 坏包

## 未包含
- 各类 .bak / app.asar.bak* / 调试 _patch_* 脚本
- darwin-arm64 原生目录
- 用户数据 / API Key

## 说明
- 旧版 outputs 根目录下的 Setup.exe（2026-10-20）不含今日补丁，请以本 release-v1 为准。
- 未签名（NotSigned），安装需管理员（all-users → Program Files\ZhuiguangDramaAI）。
