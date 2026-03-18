#!/usr/bin/env python3
"""
测试新的open_id
"""

import urllib.request
import json
import ssl

# 飞书凭证
APP_ID = "cli_a930a371aa789cd1"
APP_SECRET = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
OPEN_ID = "ou_7d8a6e6df7621556ce0d21922b676706"  # 新的open_id

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

def test_send_simple_message(token):
    """测试发送简单消息"""
    print(f"\n🔍 测试发送消息到新open_id: {OPEN_ID}")
    
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    
    payload = {
        "receive_id": OPEN_ID,
        "msg_type": "text",
        "content": json.dumps({"text": "测试消息：正在尝试发送学习诊断报告"}),
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
            
            if result.get("code") == 0:
                print(f"✅ 消息发送成功！")
                print(f"消息ID: {result.get('data', {}).get('message_id', '未知')}")
                return True
            else:
                print(f"❌ 消息发送失败，错误码: {result.get('code')}")
                print(f"错误信息: {result.get('msg')}")
                return False
                
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"❌ HTTP错误 {e.code}:")
        
        try:
            error_json = json.loads(error_body)
            print(f"错误详情: {json.dumps(error_json, indent=2, ensure_ascii=False)}")
        except:
            print(f"原始错误: {error_body}")
        
        return False

if __name__ == "__main__":
    print("🔍 开始测试新的open_id...")
    
    try:
        token = get_token()
        success = test_send_simple_message(token)
        
        if success:
            print("\n🎉 open_id验证成功！可以开始发送报告文件。")
        else:
            print("\n❌ open_id仍然存在问题，请检查是否正确。")
            
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()