import requests
import time
import json
import zipfile
import os
import io

token = "eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiIzODIwMzI4OCIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc3MzYzMjQ0NSwiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiMTg5NDkyMDk1MjQiLCJvcGVuSWQiOm51bGwsInV1aWQiOiI2YmNkNmJlYi04Mzc5LTQ5MzMtYThiZi00NmYxNjcxMjgwYzQiLCJlbWFpbCI6ImZlbmdwZWlsaW5AcGpsYWIub3JnLmNuIiwiZXhwIjoxNzgxNDA4NDQ1fQ.gMvF6PDa2WopzfQh-mHoeTdT55eXeIF3RQqYfljpSt2pP2T14UbA3QdBCKHKPQKsTkSzhn2U8hXVMokSiDSANQ"
header = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

file_paths = [
    "/Users/peilinfeng/18级试题PDF/五年新能源1801-1840301001-杨文聪.pdf",
    "/Users/peilinfeng/18级试题PDF/五年新能源1801-1840301011-彭浩博.pdf",
]

# 第一步：申请上传链接
data = {
    "files": [
        {"name": "杨文聪.pdf", "data_id": "yangwencong"},
        {"name": "彭浩博.pdf", "data_id": "penghaobo"},
    ],
    "model_version": "vlm"
}

try:
    # 申请上传URL
    url = "https://mineru.net/api/v4/file-urls/batch"
    response = requests.post(url, headers=header, json=data)
    if response.status_code != 200:
        print(f"请求失败, status: {response.status_code}")
        exit(1)

    result = response.json()
    if result["code"] != 0:
        print(f"申请上传链接失败: {result}")
        exit(1)

    batch_id = result["data"]["batch_id"]
    urls = result["data"]["file_urls"]
    print(f"batch_id: {batch_id}")

    # 第二步：上传文件
    for i in range(len(urls)):
        with open(file_paths[i], 'rb') as f:
            res_upload = requests.put(urls[i], data=f)
            if res_upload.status_code == 200:
                print(f"文件 {i+1} 上传成功")
            else:
                print(f"文件 {i+1} 上传失败: {res_upload.status_code}")
                exit(1)

    # 第三步：轮询获取解析结果
    result_url = f"https://mineru.net/api/v4/extract-results/batch/{batch_id}"
    print("\n等待解析中...")

    for attempt in range(60):  # 最多等10分钟
        time.sleep(10)
        res = requests.get(result_url, headers=header)
        if res.status_code != 200:
            print(f"查询失败: {res.status_code}")
            continue

        res_data = res.json()
        if res_data["code"] != 0:
            print(f"查询返回错误: {res_data}")
            continue

        extract_data = res_data["data"]
        # 检查是否所有文件都解析完成
        all_done = True
        for item in extract_data.get("extract_result", []):
            if item.get("state") != "done":
                all_done = False
                break

        if all_done and len(extract_data.get("extract_result", [])) == len(file_paths):
            print("解析完成！")
            # 保存结果到JSON文件
            output_path = "/Users/peilinfeng/18级试题PDF/mineru_results.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(extract_data, f, ensure_ascii=False, indent=2)
            print(f"结果已保存到: {output_path}")

            # 第四步：下载zip并解压，用PDF文件名命名文件夹
            base_dir = "/Users/peilinfeng/18级试题PDF"
            for i, item in enumerate(extract_data["extract_result"]):
                zip_url = item["full_zip_url"]
                # 从原始PDF路径提取文件名（去掉.pdf后缀）作为文件夹名
                folder_name = os.path.splitext(os.path.basename(file_paths[i]))[0]
                dest_dir = os.path.join(base_dir, folder_name)
                os.makedirs(dest_dir, exist_ok=True)

                print(f"\n下载解析结果: {folder_name} ...")
                zip_res = requests.get(zip_url)
                if zip_res.status_code != 200:
                    print(f"下载失败: {zip_res.status_code}")
                    continue

                # 解压到目标文件夹，只保留需要的文件并统一命名
                with zipfile.ZipFile(io.BytesIO(zip_res.content)) as zf:
                    for member in zf.namelist():
                        filename = os.path.basename(member)
                        if not filename:
                            continue
                        if filename == "full.md":
                            dest_name = "content.md"
                        elif filename == "content_list_v2.json":
                            dest_name = "content.json"
                        elif filename.endswith("_origin.pdf"):
                            dest_name = "content.pdf"
                        else:
                            continue  # 跳过其他文件
                        with zf.open(member) as src, open(os.path.join(dest_dir, dest_name), 'wb') as dst:
                            dst.write(src.read())
                print(f"已解压到: {dest_dir} (content.md, content.json, content.pdf)")

                # 删除原始PDF
                if os.path.exists(file_paths[i]):
                    os.remove(file_paths[i])
                    print(f"已删除原始PDF: {file_paths[i]}")

            break
        else:
            print(f"第 {attempt+1} 次查询，解析尚未完成，10秒后重试...")
    else:
        print("超时，解析未在10分钟内完成。请手动查询 batch_id:", batch_id)

except Exception as err:
    print(f"错误: {err}")
