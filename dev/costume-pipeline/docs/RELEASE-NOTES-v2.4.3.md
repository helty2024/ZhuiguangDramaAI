## 追光影视 2.4.3（Win Setup）

### 本版要点（相对 2.4.2）
- **服装资产完整链路（审计 A～E）**：正常点击生成默认走真实模型（Mock 仅内部开关）；
esult_source 区分「已生成」与「占位图/待确认」；选择服装可更新 VCE 锚点但**不覆盖人物主形象**；同页即时状态（无需切页）；asar stub 去掉本机绝对路径。
- **继承 2.4.2**：图像异步轮询统一 /images/jobs/。
- **继承 2.4.1**：模型配置弹窗、资产卡 UI、小说体、VCE、Seedance Skill OS、TEMPLATE_VERSION=7、星标图标。

### 安装包
- ZhuiguangDramaAI-2.4.3-Win10-11-x64-Setup.exe
- SHA256: 2c4dbf75974b658c3518cea223e54df06638ca6895c482301da6eddc72192936
- SOURCE asar SHA256: 1c9ab9b0dbf861c0ff9b2d31c2f2cb643f9cf2d4abb9931b0fec186e52cf9686
- FE D2CsWkmv.js SHA256: e3affba26c1d6eec4c5abe38d6dd8a4274ca487bdb7fec931d9bb6db2a648dab

### 说明
- 安装前请完全退出追光影视
- 默认安装到 C:\Program Files\ZhuiguangDramaAI；识别 2.0～2.4.3 安装标记，可同目录覆盖
- 用户数据在 %APPDATA%\ZhuiguangDramaAI，卸载不删除
- 发布包不含长期 github_token；未代跑扣积分生成
- Mac DEV 手术式热修同步另发；Mac DMG TBD
