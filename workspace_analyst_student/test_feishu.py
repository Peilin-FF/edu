#!/usr/bin/env python3
"""
测试飞书API连接和open_id验证
"""

import urllib.request
import json
import ssl

# 飞书凭证
APP_ID = "cli_a930a371aa789cd1"
APP_SECRET = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
OPEN_ID = "ou_7d8a6e6df7621556ce0d21922b676706ccs"

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
    
    print(f"✅ 成功获取token: {result['tenant_access_token'][:20]}...")
    return result["tenant_access_token"]

def test_open_id(token):
    """测试open_id是否有效"""
    url = f"https://open.feishu.cn/open-apis/contact/v3/users/{OPEN_ID}"
    
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req, context=ssl_context) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"✅ open_id验证成功: {result}")
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ open_id验证失败: HTTP {e.code}")
        print(f"错误响应: {e.read().decode('utf-8')}")
        return False

def test_send_message(token):
    """测试发送简单文本消息"""
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    
    payload = {
        "receive_id": OPEN_ID,
        "msg_type": "text",
        "content": json.dumps({"text": "测试消息：飞书文件传输功能测试"}),
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
            print(f"✅ 消息发送测试结果: {result}")
            return result
    except urllib.error.HTTPError as e:
        print(f"❌ 消息发送失败: HTTP {e.code}")
        print(f"错误响应: {e.read().decode('utf-8')}")
        return None

if __name__ == "__main__":
    print("🔍 开始测试飞书API连接...")
    
    try:
        # 1. 获取token
        token = get_token()
        
        # 2. 测试open_id
        print("\n🔍 测试open_id有效性...")
        if test_open_id(token):
            print("✅ open_id格式正确且有效")
        else:
            print("❌ open_id可能存在问题")
            
        # 3. 测试发送简单消息
        print("\n🔍 测试发送文本消息...")
        result = test_send_message(token)
        if result and result.get("code") == 0:
            print("✅ 可以正常发送消息给该用户")
        else:
            print("❌ 无法发送消息给该用户")
            
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()