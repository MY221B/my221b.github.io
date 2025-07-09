# 随机餐厅选择器 🍽️

一个帮助你从大众点评收藏夹中随机选择餐厅的Web应用，解决"今天吃什么"的世纪难题！

![随机选餐厅](https://github.com/user-attachments/assets/e80e7aed-b81f-473a-b277-2a9e42777b56)

## ✨ 主要功能

### 🎯 核心功能
- **随机选择**: 从你的餐厅收藏中随机选择一家餐厅
- **智能筛选**: 支持按城市和距离筛选餐厅
- **位置服务**: 自动获取当前位置，计算餐厅距离和驾车时间
- **历史记录**: 保存选择历史，避免重复选择

### 📍 地理位置服务
- 自动获取用户当前位置
- 支持手动输入地址
- 实时计算距离、驾车时间和打车费用
- 基于高德地图API的精准路径规划

### 🏙️ 多城市支持
- 支持多个城市的餐厅数据
- 智能城市识别和筛选
- 跨城市餐厅管理

## 🛠️ 技术架构

### 前端技术栈
- **HTML5**: 语义化页面结构
- **CSS3 + Tailwind CSS**: 现代化响应式设计
- **JavaScript (ES6+)**: 核心业务逻辑
- **PapaParse**: CSV数据解析

### 后端服务
- **高德地图API**: 地理编码、路径规划、距离计算
- **Supabase**: 数据存储和文件托管

### 开发工具
- **Node.js**: 数据处理脚本
- **Python**: 批量地理编码处理
- **GitHub Pages**: 静态网站部署

## 📁 项目结构

```
my221b.github.io/
├── index.html              # 主页面
├── script.js               # 核心JavaScript逻辑
├── styles.css              # 样式文件
├── output.css              # Tailwind编译后的CSS
├── distance.js             # 距离计算工具
├── distanceWorker.js       # Web Worker距离计算
├── restaurants.csv         # 餐厅数据文件
├── rest_data_process/      # 数据处理脚本
│   ├── restaurants_lat_long.py
│   └── restaurants.csv
├── tailwind.config.js      # Tailwind配置
├── postcss.config.js       # PostCSS配置
└── README.md              # 项目说明
```

## 🚀 快速开始

### 在线使用
直接访问 [my221b.github.io](https://my221b.github.io) 即可使用

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/my221b/my221b.github.io.git
   cd my221b.github.io
   ```

2. **安装依赖**
   ```bash
   npm install -g tailwindcss
   ```

3. **编译CSS**
   ```bash
   npx tailwindcss -i ./styles.css -o ./output.css --watch
   ```

4. **启动本地服务器**
   ```bash
   # 使用Python
   python -m http.server 8000
   
   # 或使用Node.js
   npx serve .
   ```

5. **访问应用**
   打开浏览器访问 `http://localhost:8000`

## 📊 数据处理

### 添加新餐厅数据

1. 将餐厅数据保存为CSV格式
2. 运行地理编码脚本获取经纬度：
   ```bash
   python rest_data_process/restaurants_lat_long.py
   ```
3. 更新主数据文件 `restaurants.csv`

### 计算距离数据

使用Node.js脚本批量计算距离：
```bash
node distance.js
```

## 🎨 界面特色

- **现代化设计**: 使用Tailwind CSS构建的美观界面
- **响应式布局**: 完美适配移动端和桌面端
- **流畅动画**: 优雅的交互效果和过渡动画
- **直观操作**: 简单易用的用户界面

## 🔧 配置说明

### 高德地图API
在 `script.js` 中配置你的高德地图API密钥：
```javascript
const API_KEY = 'your_amap_api_key_here';
```

### 数据源配置
修改数据文件路径和格式以适配你的数据源。

## 📱 使用指南

1. **获取位置**: 允许浏览器获取位置或手动输入地址
2. **选择城市**: 从下拉菜单选择目标城市
3. **设置距离**: 调整最大距离范围（可选）
4. **开始选择**: 点击"今天吃什么"按钮
5. **查看结果**: 查看选中的餐厅信息和路线
6. **历史记录**: 查看之前的选择历史

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [高德地图API](https://lbs.amap.com/) - 地理位置服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [PapaParse](https://www.papaparse.com/) - CSV解析库
- [Supabase](https://supabase.com/) - 数据托管服务

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 [GitHub Issue](https://github.com/my221b/my221b.github.io/issues)
- 邮箱: [your-email@example.com]

---

⭐ 如果这个项目对你有帮助，请给它一个星标！

