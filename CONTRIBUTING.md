# Contributing

本仓库公开内容为 **文档 + Releases 安装包**，**不包含应用源码**。

## 文档修正

欢迎通过 Pull Request 修正 `README.md` 中的错字、失效下载链接或过期 SHA256。功能描述请与已发布的 Release 说明保持一致，勿编造能力。

## 问题反馈

如需报告安装 / 运行问题，请开 [Issue](https://github.com/helty2024/ZhuiguangDramaAI/issues)，并尽量附上：

- 系统版本（Windows 10/11 或 macOS arm64）
- 安装包文件名与 SHA256
- 复现步骤（可附截图）

客户端二进制仅通过 [Releases](https://github.com/helty2024/ZhuiguangDramaAI/releases) 分发；源码级改动不在本仓接受范围。

## 开发源码模块（服装资产）

自 2026-11-04 起，仓库在 `dev/costume-pipeline/` 收录**可维护的服装资产管线源码与不付费回归测试**（审计 A–E + 一次真生成验收后的规则固化）。

- 该目录是服装规则的开发源码真相源，防止仅存在于便携版 asar/_nuxt 热修中、下次发版回退。
- 完整 Electron/Nuxt 应用源码仍不在本仓；客户端二进制仍仅通过 Releases 分发。
- 运行：`cd dev/costume-pipeline && npm test`（不得触发付费模型）。
- 构建映射见 `dev/costume-pipeline/docs/BUILD.md`。

