#!/usr/bin/env python3
"""
飞书文件传输技能核心脚本
支持命令行调用和 Python 模块导入两种方式
依赖：Python 标准库（无需安装第三方包）
"""

import urllib.request
import json
import ssl
import os
import sys
import argparse


class FeishuFileTransfer:
    """飞书文件传输器"""

    def __init__(self, app_id: str = None, app_secret: str = None):
        """
        初始化传输器。
        凭证优先使用传入参数，其次读取环境变量。
        """
        self.app_id = app_id or os.getenv("FEISHU_APP_ID")
        self.app_secret = app_secret or os.getenv("FEISHU_APP_SECRET")

        if not self.app_id or not self.app_secret:
            raise ValueError(
                "未提供飞书凭证。请设置环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET，"
                "或在初始化时传入 app_id 和 app_secret。"
            )

        # SSL 上下文：兼容部分企业网络环境
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    # ------------------------------------------------------------------ #
    # 内部方法
    # ------------------------------------------------------------------ #

    def _get_token(self) -> str:
        """获取 tenant_access_token"""
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {"app_id": self.app_id, "app_secret": self.app_secret}

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
        )
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, context=self.ssl_context) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        if result.get("code") != 0:
            raise RuntimeError(f"获取 token 失败：{result}")

        return result["tenant_access_token"]

    def _upload_file(self, token: str, file_path: str) -> str:
        """上传文件到飞书，返回 file_key"""
        url = "https://open.feishu.cn/open-apis/im/v1/files"

        with open(file_path, "rb") as f:
            file_data = f.read()

        file_name = os.path.basename(file_path)
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

        # 构建 multipart/form-data 请求体
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode("utf-8")
        body += file_data
        body += f"\r\n--{boundary}\r\n".encode("utf-8")
        body += b'Content-Disposition: form-data; name="file_type"\r\n\r\nstream\r\n'
        body += f"--{boundary}--\r\n".encode("utf-8")

        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

        with urllib.request.urlopen(req, context=self.ssl_context) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        if result.get("code") != 0:
            raise RuntimeError(f"文件上传失败：{result}")

        return result["data"]["file_key"]

    def _send_file(self, token: str, file_key: str, receive_id: str) -> dict:
        """将已上传的文件发送给指定用户"""
        url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"

        payload = {
            "receive_id": receive_id,
            "msg_type": "file",
            "content": json.dumps({"file_key": file_key}),
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
        )
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, context=self.ssl_context) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # ------------------------------------------------------------------ #
    # 公开方法
    # ------------------------------------------------------------------ #

    def transfer_file(self, file_path: str, receive_id: str) -> dict:
        """
        完整的文件传输流程：获取 token → 上传文件 → 发送消息

        Args:
            file_path:   本地文件的绝对或相对路径
            receive_id:  接收者的飞书 open_id（格式：ou_xxxxxxxxxx）

        Returns:
            飞书 API 的响应字典；code==0 表示成功
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"文件不存在：{file_path}")

        print(f"📤 正在发送文件：{os.path.basename(file_path)}")

        token = self._get_token()
        print("  ✔ 已获取访问令牌")

        file_key = self._upload_file(token, file_path)
        print(f"  ✔ 文件已上传，file_key={file_key}")

        result = self._send_file(token, file_key, receive_id)

        if result.get("code") == 0:
            print(f"  ✔ 文件已成功发送给 {receive_id}")
        else:
            print(f"  ✘ 发送失败：{result}")

        return result


# ------------------------------------------------------------------ #
# 命令行入口
# ------------------------------------------------------------------ #

def main():
    parser = argparse.ArgumentParser(
        description="通过飞书机器人将文件发送给指定用户",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  # 使用环境变量提供凭证
  export FEISHU_APP_ID=cli_xxx
  export FEISHU_APP_SECRET=xxx
  python3 feishu_transfer.py --file report.pdf --to ou_xxxxxxxxxx

  # 直接传入凭证
  python3 feishu_transfer.py \\
    --app-id cli_xxx --app-secret xxx \\
    --file report.pdf --to ou_xxxxxxxxxx
        """,
    )
    parser.add_argument("--file", required=True, help="要发送的文件路径")
    parser.add_argument("--to", required=True, dest="receive_id", help="接收者的 open_id")
    parser.add_argument("--app-id", default=None, help="飞书 App ID（可用环境变量 FEISHU_APP_ID 代替）")
    parser.add_argument("--app-secret", default=None, help="飞书 App Secret（可用环境变量 FEISHU_APP_SECRET 代替）")

    args = parser.parse_args()

    try:
        transfer = FeishuFileTransfer(app_id=args.app_id, app_secret=args.app_secret)
        result = transfer.transfer_file(file_path=args.file, receive_id=args.receive_id)
        sys.exit(0 if result.get("code") == 0 else 1)
    except Exception as e:
        print(f"❌ 错误：{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()