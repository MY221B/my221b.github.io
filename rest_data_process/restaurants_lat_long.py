import pandas as pd
import requests

##可以把最新爬下来的文件先放到rest_data_process文件夹中
# 再运行该python，再把数据粘贴到最新的restaurants.csv文件中
# 在底部可以更新读取的csv文件名称，以及输出的csv文件名称
##在teminal中运行：python rest_data_process/restaurants_lat_long.py

# 高德地图API密钥
API_KEY = 'd111bbe935342b4ac8d1707ff6523552'  # 替换为你的API密钥

def get_lat_long(city, address, restaurant_name):
    # 第一次尝试：使用完整地址
    address_full = f"{city}{address}"
    geocode_url = f"https://restapi.amap.com/v3/geocode/geo?address={requests.utils.quote(address_full)}&output=json&key={API_KEY}"
    
    response = requests.get(geocode_url)
    data = response.json()
    
    if data['status'] == '1' and data['geocodes']:
        return data['geocodes'][0]['location']
    
    # 第二次尝试：使用城市+餐厅名称
    address_full = f"{city}{restaurant_name}"
    geocode_url = f"https://restapi.amap.com/v3/geocode/geo?address={requests.utils.quote(address_full)}&output=json&key={API_KEY}"
    
    response = requests.get(geocode_url)
    data = response.json()
    
    if data['status'] == '1' and data['geocodes']:
        return data['geocodes'][0]['location']
    
    # 第三次尝试：使用餐厅名称+地址
    address_full = f"{restaurant_name}{address}"
    geocode_url = f"https://restapi.amap.com/v3/geocode/geo?address={requests.utils.quote(address_full)}&output=json&key={API_KEY}"
    
    response = requests.get(geocode_url)
    data = response.json()
    
    if data['status'] == '1' and data['geocodes']:
        return data['geocodes'][0]['location']
    else:
        formatted_address = data['geocodes'][0]['formatted_address'] if data.get('geocodes') else 'No address returned'
        print(f'Unable to geocode address: {restaurant_name} - {formatted_address}')
        return None

# 读取CSV文件
df = pd.read_csv('rest_data_process/restaurants.csv')

# 检查是否存在经纬度列
if '经纬度' not in df.columns:
    df['经纬度'] = None  # 如果没有，则添加经纬度列

# 统计变量
success_count = 0
fail_count = 0

# 对经纬度列值为空的行进行处理
for index, row in df[df['经纬度'].isnull()].iterrows():
    result = get_lat_long(row['city'], row['地址'], row['名称'])
    if result:
        success_count += 1
    else:
        fail_count += 1
    df.at[index, '经纬度'] = result

# 将经纬度列插入到第五列位置
df.insert(4, '经纬度', df.pop('经纬度'))

# 直接覆盖原有的CSV文件
df.to_csv('rest_data_process/restaurants.csv', index=False)

# 输出统计结果
print(f"\n处理完成！")
print(f"成功获取经纬度：{success_count} 个")
print(f"获取失败：{fail_count} 个")