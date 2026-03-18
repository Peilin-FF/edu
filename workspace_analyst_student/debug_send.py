#!/usr/bin/env python3
"""
调试飞书文件发送问题
"""

import urllib.request
import json
import ssl
import os

# 飞书凭证
APP_ID = "cli_a930a371aa789cd1"
APP_SECRET = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
OPEN_ID = "ou_7d8a6e6df7621556ce0d21922b676706ccs"
FILE_PATH = "memory/1840101020_report_2022-10-25.html"

# SSL上下文
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

def get_token():
    """获取tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": APP_ID, "app_secret": APP_SECRET}
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    
    with urllib.request.urlopen(req, context=ssl_context) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    if result.get("code") != 0:
        raise RuntimeError(f"获取token失败：{result}")
    
    print(f"✅ Token获取成功")
    return result["tenant_access_token"]

def upload_file(token):
    """上传文件"""
    url = "https://open.feishu.cn/open-apis/im/v1/files"
    
    with open(FILE_PATH, "rb") as f:
        file_data = f.read()
    
    file_name = os.path.basename(FILE_PATH)
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    # 构建multipart/form-data请求体
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
    
    with urllib.request.urlopen(req, context=ssl_context) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    if result.get("code") != 0:
        raise RuntimeError(f"文件上传失败：{result}")
    
    print(f"✅ 文件上传成功，file_key: {result['data']['file_key']}")
    return result["data"]["file_key"]

def send_file_debug(token, file_key):
    """调试发送文件消息"""
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    
    payload = {
        "receive_id": OPEN_ID,
        "msg_type": "file",
        "content": json.dumps({"file_key": file_key}),
    }
    
    print(f"\n🔍 发送消息的payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, context=ssl_context) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"\n✅ 消息发送成功:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return result
    except urllib.error.HTTPError as e:
        print(f"\n❌ HTTP错误 {e.code}:")
        error_body = e.read().decode("utf-8")
        print(f"错误响应: {error_body}")
        
        # 尝试解析错误信息
        try:
            error_json = json.loads(error_body)
            print(f"\n📋 错误详情:")
            print(json.dumps(error_json, indent=2, ensure_ascii=False))
            
            # 检查是否有排查建议
            if "error" in error_json and "troubleshooter" in error_json["error"]:
                print(f"\n🔗 排查建议链接: {error_json['error']['troubleshooter']}")
                
        except:
            pass
            
        return None

def test_with_text(token):
    """测试发送文本消息"""
    print(f"\n🔍 测试发送文本消息...")
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    
    payload = {
        "receive_id": OPEN_ID,
        "msg_type": "text",
        "content": json.dumps({"text": "测试文本消息，请确认是否收到"}),
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, context=ssl_context) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"✅ 文本消息发送结果: {result}")
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"❌ 文本消息发送失败: HTTP {e.code}")
        print(f"错误: {error_body}")
        return None

if __name__ == "__main__":
    print("🔍 开始调试飞书文件发送...")
    
    try:
        # 1. 获取token
        token = get_token()
        
        # 2. 先测试发送文本消息
        text_result = test_with_text(token)
        if text_result and text_result.get("code") == 0:
            print("✅ 文本消息可以正常发送，说明open_id有效")
        else:
            print("❌ 文本消息也无法发送，open_id可能无效或机器人无权限")
            
        # 3. 上传文件
        file_key = upload_file(token)
        
        # 4. 发送文件消息（详细调试）
        send_file_debug(token, file_key)
        
    except Exception as e:
        print(f"\n❌ 调试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()