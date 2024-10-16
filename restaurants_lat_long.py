import pandas as pd
import requests

##在底部可以更新读取的csv文件名称，以及输出的csv文件名称
##在teminal中运行：python restaurants_lat_long.py

# 高德地图API密钥
API_KEY = 'd111bbe935342b4ac8d1707ff6523552'  # 替换为你的API密钥

def get_lat_long(city, address):
    address_full = f"{city}{address}"
    geocode_url = f"https://restapi.amap.com/v3/geocode/geo?address={requests.utils.quote(address_full)}&output=json&key={API_KEY}"
    print('Sending geocode request for address:', geocode_url)
    
    response = requests.get(geocode_url)
    data = response.json()
    print('Geocode response for address:', data)
    
    if data['status'] == '1' and data['geocodes']:
        return data['geocodes'][0]['location']
    else:
        print('Unable to geocode address')
        return None

# 读取CSV文件
df = pd.read_csv('restaurants.csv')

# 检查是否存在经纬度列
if '经纬度' not in df.columns:
    df['经纬度'] = None  # 如果没有，则添加经纬度列

# 对经纬度列值为空的行进行处理
for index, row in df[df['经纬度'].isnull()].iterrows():
    df.at[index, '经纬度'] = get_lat_long(row['city'], row['地址'])

# 将经纬度列插入到第五列位置
df.insert(4, '经纬度', df.pop('经纬度'))

# 直接覆盖原有的CSV文件
df.to_csv('restaurants.csv', index=False)