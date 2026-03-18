#!/bin/bash

# 邮件发送脚本
EMAIL="1424074336@qq.com"
REPORT_FILE="memory/1840101020_report_2022-10-25.html"
SUBJECT="学习诊断报告 - 牛子健 (1840101020) - 2022-10-25"

# 检查报告文件是否存在
if [ ! -f "$REPORT_FILE" ]; then
    echo "错误：报告文件不存在: $REPORT_FILE"
    exit 1
fi

# 创建邮件内容
echo "正在准备发送学习诊断报告..."
echo "收件人: $EMAIL"
echo "主题: $SUBJECT"
echo "文件大小: $(du -h "$REPORT_FILE" | cut -f1)"

# 尝试使用mail命令发送
echo "发送邮件中..."

# 创建临时文件用于邮件内容
TEMP_MSG=$(mktemp)
cat > "$TEMP_MSG" << EOF
尊敬的老师/家长：

您好！

附件是学生牛子健（学号：1840101020）的学习诊断报告，考试日期为2022年10月25日。

报告摘要：
- 总分：76/100分（得分率76%）
- 通过状态：通过（良好）
- 报告包含详细的题目分析、知识点掌握情况和个性化学习建议

请查看附件中的HTML报告文件，该文件可以直接在浏览器中打开。

如有任何问题，请随时联系。

此致
敬礼！

学习诊断系统
$(date +"%Y年%m月%d日 %H:%M")
EOF

# 尝试发送邮件
if command -v mail &> /dev/null; then
    # 使用mail命令发送（可能需要配置邮件服务器）
    echo "使用mail命令发送..."
    mail -s "$SUBJECT" -a "$REPORT_FILE" "$EMAIL" < "$TEMP_MSG"
    
    if [ $? -eq 0 ]; then
        echo "✅ 邮件发送成功！"
    else
        echo "❌ mail命令发送失败，尝试其他方法..."
    fi
else
    echo "❌ 未找到mail命令"
fi

# 清理临时文件
rm -f "$TEMP_MSG"

echo ""
echo "如果邮件发送失败，您也可以："
echo "1. 手动下载报告文件: $REPORT_FILE"
echo "2. 通过其他方式发送"
echo "3. 检查系统邮件配置"