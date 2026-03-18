#!/usr/bin/env python3
# 测试飞书消息发送

import urllib.request
import json
import ssl
import os

class TestFeishuMessage:
    def __init__(self, app_id, app_secret):
        self.app_id = app_id
        self.app_secret = app_secret
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def get_token(self):
        """获取tenant_access_token"""
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), method="POST")
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, context=self.ssl_context) as response:
            result = response.read().decode('utf-8')
            return json.loads(result)['tenant_access_token']

    def send_text_message(self, token, receive_id, text):
        """发送文本消息给指定用户"""
        url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
        
        data = {
            "receive_id": receive_id,
            "msg_type": "text",
            "content": json.dumps({"text": text})
        }
        
        print(f"发送消息URL: {url}")
        print(f"请求数据: {json.dumps(data, indent=2)}")
        
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), method="POST")
        req.add_header('Authorization', f'Bearer {token}')
        req.add_header('Content-Type', 'application/json')
        
        try:
            with urllib.request.urlopen(req, context=self.ssl_context) as response:
                result = response.read().decode('utf-8')
                print(f"响应: {result}")
                return json.loads(result)
        except Exception as e:
            print(f"发送消息失败: {e}")
            import traceback
            traceback.print_exc()
            return None

def main():
    app_id = "cli_a930a371aa789cd1"
    app_secret = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
    receive_id = "ou_7d8a6e6df7621556ce0d21922b676706ccs"
    
    transfer = TestFeishuMessage(app_id, app_secret)
    token = transfer.get_token()
    
    if token:
        print(f"成功获取token")
        
        # 发送测试消息
        result = transfer.send_text_message(token, receive_id, "测试消息: 学习诊断报告已生成，正在尝试发送文件...")
        
        if result and result.get('code') == 0:
            print("✅ 测试消息发送成功!")
        else:
            print(f"❌ 测试消息发送失败: {result}")
    else:
        print("获取token失败")

if __name__ == "__main__":
    main()