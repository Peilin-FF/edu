#!/usr/bin/env python3
# 调试飞书API调用

import urllib.request
import json
import ssl
import os

class DebugFeishuTransfer:
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
        
        print(f"获取token URL: {url}")
        print(f"请求数据: {json.dumps(data)}")
        
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), method="POST")
        req.add_header('Content-Type', 'application/json')
        
        try:
            with urllib.request.urlopen(req, context=self.ssl_context) as response:
                result = response.read().decode('utf-8')
                print(f"Token响应: {result}")
                result_json = json.loads(result)
                if 'tenant_access_token' in result_json:
                    return result_json['tenant_access_token']
                else:
                    print(f"错误响应: {result_json}")
                    return None
        except Exception as e:
            print(f"获取token失败: {e}")
            return None

def main():
    app_id = "cli_a930a371aa789cd1"
    app_secret = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
    
    transfer = DebugFeishuTransfer(app_id, app_secret)
    token = transfer.get_token()
    
    if token:
        print(f"成功获取token: {token[:20]}...")
    else:
        print("获取token失败")

if __name__ == "__main__":
    main()