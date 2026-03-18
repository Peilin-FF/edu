---
name: feishu_file_transfer
description: 将文件通过飞书机器人API发送给指定用户。当用户提到"发送文件到飞书"、"飞书传文件"、"用飞书发送"、"feishu transfer"、"lark发文件"，或者需要将生成的文件（PDF、Word、Excel等）通过飞书机器人推送给指定接收者时，必须使用此技能。即使用户没有明确说"技能"，只要涉及飞书文件发送的场景，都应主动触发本技能。
---

# 飞书文件传输技能 (Feishu File Transfer)

将本地文件通过飞书机器人 API 上传并发送给指定的飞书用户。

---

## 快速开始

### 所需信息

使用前请确认以下三项：

| 参数 | 说明 | 示例 |
|------|------|------|
| `FEISHU_APP_ID` | 飞书机器人 App ID | `cli_a92ee666e1389bc2` |
| `FEISHU_APP_SECRET` | 飞书机器人 App Secret | `n9arOA6nP0WcXIOD5T...` |
| 接收者 `open_id` | 飞书用户的 open_id | `ou_xxxxxxxxxx` |

凭证优先从环境变量读取，也可在从USER.md读取，或调用时直接传入。

---

## 使用方式

### 方式一：命令行调用

```bash
# 设置环境变量（推荐）
export FEISHU_APP_ID="cli_your_app_id"
export FEISHU_APP_SECRET="your_app_secret"

# 发送文件
python3 scripts/feishu_transfer.py \
  --file "/path/to/yourfile.pdf" \
  --to "ou_xxxxxxxxxx"
```

### 方式二：Python 代码调用

```python
from scripts.feishu_transfer import FeishuFileTransfer

transfer = FeishuFileTransfer(
    app_id="cli_your_app_id",
    app_secret="your_app_secret"
)

result = transfer.transfer_file(
    file_path="/path/to/yourfile.xlsx",
    receive_id="ou_xxxxxxxxxx"
)

print("✅ 发送成功！" if result.get("code") == 0 else f"❌ 发送失败：{result}")
```

---

## 工作流程

```
1. 获取 tenant_access_token
        ↓
2. 上传文件 → 获得 file_key
        ↓
3. 使用 file_key 发送消息给指定用户
        ↓
4. 返回发送结果
```

---

## 注意事项

- 文件大小不得超过飞书 API 限制（单文件建议 < 30MB）
- 接收者 `open_id` 格式为 `ou_` 开头的字符串
- SSL 证书验证已做兼容处理，无需额外配置
- 所有 HTTP 请求使用 Python 标准库，**无需安装第三方依赖**

---

## 脚本文件

核心实现位于 `scripts/feishu_transfer.py`，详见该文件中的注释。