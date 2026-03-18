#!/usr/bin/env python3
# 飞书文件发送包装脚本

import sys
import os

# 添加技能目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'skills/feishu_file_fransfer'))

from feishu_file_transfer import FeishuFileTransfer

def main():
    # 从USER.md中获取的凭证信息
    app_id = "cli_a930a371aa789cd1"
    app_secret = "6OMiEy64hDlLQUT7G8aosgRahdhtt5B6"
    receive_id = "ou_7d8a6e6df7621556ce0d21922b676706ccs"
    
    # 报告文件路径
    report_file = "memory/1840101020_report_2022-10-25.html"
    
    # 检查文件是否存在
    if not os.path.exists(report_file):
        print(f"错误: 报告文件不存在: {report_file}")
        sys.exit(1)
    
    print(f"准备发送报告: {report_file}")
    print(f"接收者ID: {receive_id}")
    
    # 创建传输对象
    transfer = FeishuFileTransfer(app_id, app_secret)
    
    try:
        # 发送文件
        result = transfer.transfer_file(report_file, receive_id)
        
        if result.get('code') == 0:
            print("✅ 报告已成功发送到飞书!")
            print(f"消息ID: {result.get('data', {}).get('message_id', '未知')}")
        else:
            print(f"❌ 发送失败: {result}")
            
    except Exception as e:
        print(f"❌ 发送过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()