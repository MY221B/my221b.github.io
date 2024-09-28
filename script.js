// 全局变量
let restaurants = [];
let userPosition;
let savedLocations = [];
let nearestLocation;
let minDrivingTime = Infinity;
let directDistance = false; // 新增全局变量
let directDistances = []; // 新增数组存储直线距离
let userCity = null; // 新增全局变量存储用户所在城市
let initCount = 0;

const API_KEY = 'd111bbe935342b4ac8d1707ff6523552'; // 请替换为您的实际 API key

// 加载默认的CSV文件
// 修改 loadDefaultCSV 函数，在数据加载完成后调用 onCSVDataLoaded
function loadDefaultCSV() {
    fetch('https://raw.githubusercontent.com/MY221B/my221b.github.io/main/restaurants.csv')
        .then(response => response.text())
        .then(csvData => {
            processCSVData(csvData);
            onCSVDataLoaded();
        })
        .catch(error => console.error('Error loading default CSV file:', error));
}

function onCSVDataLoaded() {
    updateCityList();
    updateRestaurantCount(); // 更新餐厅数量
    // 其他需要在数据加载后执行的操作...
}

// 处理CSV数据
function processCSVData(csvData) {
    Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            try {
                restaurants = results.data
                    .filter(row => row['名称'] && row['名称'].trim() !== '')
                    .map(row => ({
                        name: row['名称'] || '未提供',
                        url: convertToMobileUrl(row['J_shopt href']) || '#',
                        address: row['地址'] || '未提供',
                        city: formatCityName(row['city']), // 使用 formatCityName
                        tel: row['tel'] || '未提供',
                        time: row['time'] || '未提供',
                        ...row  // 保留所有原始数据
                    }));
                console.log('Restaurants data loaded:', restaurants.length);
                console.log('Sample restaurant data:', restaurants[0]); // 输出第一个餐厅的数据作为样本
                extractSavedLocations(restaurants);
                updateRestaurantCount();
            } catch (error) {
                console.error('Error processing CSV data:', error);
            }
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
        }
    });
}

// 从餐厅数据中提取保存的位置信息
function extractSavedLocations(restaurants) {
    const locationSet = new Set();
    restaurants.forEach(restaurant => {
        Object.keys(restaurant).forEach(key => {
            if (key.endsWith('距离')) {
                const location = key.replace('距离', '');
                locationSet.add(location);
            }
        });
    });
    savedLocations = Array.from(locationSet);
    console.log('Extracted saved locations:', savedLocations);
    if (savedLocations.length === 0) {
        console.warn('No saved locations found in the data. Please check the CSV file format.');
    }
}

// 请求用户的地理位置
function requestUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            userPosition = {
                lng: position.coords.longitude,
                lat: position.coords.latitude
            };
            console.log('User position:', userPosition);
            
            reverseGeocode(userPosition.lng, userPosition.lat)
                .then(city => {
                    console.log('User city:', city);
                    userCity = formatCityName(city);
                    updateCityList(city);
                    updateCitySelect(city); // 里传入的是完整的市名称
                    updateDistanceFilterVisibility();
                    calculateNearestLocation(userPosition);
                    document.getElementById('location').placeholder = "已成功获取当前地址";
                })
                .catch(error => {
                    console.error('Error in reverse geocoding:', error);
                    alert('无法获取城市信息，请手动选择城市。');
                });
        }, function(error) {
            console.error('Error getting user location:', error);
            // 如果获取用户位置失败，设置默认位置为所选择城市的中心点
            const defaultCity = document.getElementById('city').value;
            if (defaultCity) {
                const defaultCenter = getCityCenter(defaultCity); // 假设有一个函数getCityCenter获取城市中心点
                if (defaultCenter) {
                    userPosition = defaultCenter;
                    console.log('Default position set:', userPosition);
                    document.getElementById('location').placeholder = `定位至${defaultCity}中心，请手动搜索当前位置。`;
                    calculateNearestLocation(userPosition);
                } else {
                    alert('请手动输入位置，获取餐厅到您的距离信息。');
                }
            } else {
                alert('请手动输入位置，获取餐厅到您的距离信息。');
            }
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
        alert('请手动输入位置，获取餐厅到您的距离信息。');
    }
}

// 搜索用户输入的位
function searchLocation() {
    const address = document.getElementById('location').value;

    // 移除对空地址的检查，避免弹出提示框
    if (!address) {
        // 这里可以选择不做任何事情，或者可以给用户一个提示，但不弹出框
        return;
    }

    const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&output=json&key=${API_KEY}`;
    
    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status === '1' && data.geocodes.length > 0) {
                const geocode = data.geocodes[0];
                const location = geocode.location.split(',');
                userPosition = {
                    lng: parseFloat(location[0]),
                    lat: parseFloat(location[1])
                };
                console.log('User position updated:', userPosition);
                document.getElementById('location').placeholder = "已成功获取当前地址";
                
                const city = geocode.city;
                userCity = formatCityName(city);
                console.log('User city:', city);
                updateCitySelect(city);
                updateDistanceFilterVisibility();
                
                alert('位置已更新');
                calculateNearestLocation(userPosition);
            } else {
                alert('无法找到该位置，请尝试更详细的地址');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('位置搜索失败，请稍后重试');
        });
}

// 使用高德地图API进行逆地理编码，将经纬度转换为城市名称
function reverseGeocode(lng, lat) {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${API_KEY}&location=${lng},${lat}&extensions=base`;
    
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === "1" && data.regeocode) {
                const addressComponent = data.regeocode.addressComponent;
                let city = addressComponent.city;
                
                if (!city || city.length === 0) {
                    city = addressComponent.province;
                }
                
                return formatCityName(city);
            } else {
                throw new Error('Unable to reverse geocode');
            }
        });
}

// 计算用户位置到所有保存位置的距离，找出最近的位置
function calculateNearestLocation(userPosition) {
    console.log('Calculating nearest location for user position:', userPosition);
    console.log('Number of saved locations:', savedLocations.length);
    
    if (savedLocations.length === 0) {
        console.error('No saved locations available. Cannot calculate nearest location.');
        return;
    }

    nearestLocation = null;
    minDrivingTime = Infinity;

    const promises = savedLocations.map(location => {
        console.log('Processing location:', location);
        const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(location)}&output=json&key=${API_KEY}`;
        return fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                console.log('Geocode response for location:', location, data);
                if (data.status === '1' && data.geocodes.length > 0) {
                    const [lng, lat] = data.geocodes[0].location.split(',');
                    const drivingUrl = `https://restapi.amap.com/v3/direction/driving?origin=${userPosition.lng},${userPosition.lat}&destination=${lng},${lat}&extensions=base&key=${API_KEY}`;
                    return fetch(drivingUrl)
                        .then(response => response.json())
                        .then(data => {
                            console.log('Driving route response for location:', location, data);
                            if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
                                const drivingTime = parseInt(data.route.paths[0].duration) / 60;  // 转换为分钟
                                console.log(`Driving time to ${location}: ${drivingTime} minutes`);
                                return { location, drivingTime };
                            }
                            console.log(`Unable to calculate driving time to ${location}`);
                            return null;
                        });
                }
                console.log(`Unable to geocode location: ${location}`);
                return null;
            })
            .catch(error => {
                console.error(`Error processing location ${location}:`, error);
                return null;
            });
    });

    Promise.all(promises)
        .then(results => {
            console.log('All location calculations completed. Results:', results);
            results.forEach(result => {
                if (result && result.drivingTime < minDrivingTime) {
                    minDrivingTime = result.drivingTime;
                    nearestLocation = result.location;
                }
            });
            console.log(`Nearest location: ${nearestLocation}, Driving time: ${minDrivingTime} minutes`);

            // 新增逻辑检查
            if (minDrivingTime > 30) {
                nearestLocation = userPosition;
                directDistance = true; // 设置为 true
                calculateDirectDistance(nearestLocation); // 计算直线距离
                console.log('应该计算直线距离');
            }

            updateTimeFilterUI();
            updateRestaurantCount(); // 更新餐厅数量
        })
        .catch(error => {
            console.error('Error in calculateNearestLocation:', error);
        });
}

// 新增计算直线距离的函数
function calculateDirectDistance(nearestLocation) {
    const worker = new Worker('distanceWorker.js');
    worker.onmessage = function(event) {
        directDistances = event.data;
        console.log('Direct distances calculated:', directDistances);
        updateTimeFilterUI();
    };
    
    const selectedCity = formatCityName(document.querySelector('.selected-city').textContent);
    const cityRestaurants = restaurants.filter(r => compareCityNames(formatCityName(r.city), selectedCity));
    
    worker.postMessage({ userPosition, restaurants: cityRestaurants });
    console.log('计算直线距离中');
}

// 获取餐厅的经纬度
function getRestaurantLocation(restaurant) {
    if (restaurant['经纬度']) {
        return Promise.resolve(restaurant['经纬度']);
    } else {
        const address = `${restaurant.city}${restaurant.address}`;
        const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&output=json&key=${API_KEY}`;
        console.log('Sending geocode request for restaurant:', geocodeUrl);
        return fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                console.log('Geocode response for restaurant:', data);
                if (data.status === '1' && data.geocodes.length > 0) {
                    return data.geocodes[0].location;
                } else {
                    console.log('Unable to geocode restaurant address');
                    throw new Error('无法解析餐厅地址');
                }
            })
            .catch(error => {
                console.error('Error in geocode request for restaurant:', error);
                throw error;
            });
    }
}
// 获取餐厅位置并计算与用户的距离
function getRestaurantLocationAndCalculateDistance(restaurant) {
    console.log('Getting location for restaurant:', restaurant);
    getRestaurantLocation(restaurant)
        .then(location => {
            console.log('Restaurant location obtained:', location);
            calculateDistance(userPosition, location.split(','), restaurant)
                .then(({ distance, duration, taxiCost }) => {
                    updateDistanceInfo(distance, duration, taxiCost);
                    addToHistory(restaurant, distance, duration, taxiCost);
                })
                .catch(error => {
                    console.error('Error calculating distance:', error);
                    addToHistory(restaurant, null, null, null);
                });
        })
        .catch(error => {
            console.error('Error in geocode request for restaurant:', error);
            document.getElementById('distance-info').textContent = '地理编码请求失败';
            addToHistory(restaurant, null, null, null);
        });
}



// 计算用户位置到餐厅的距离
function calculateDistance(origin, destination, restaurant) {
    console.log('Calculating distance from', origin, 'to', destination);
    const drivingUrl = `https://restapi.amap.com/v3/direction/driving?origin=${origin.lng},${origin.lat}&destination=${destination[0]},${destination[1]}&extensions=all&strategy=10&key=${API_KEY}`;
    
    console.log('Sending driving route request:', drivingUrl);
    return fetch(drivingUrl)
        .then(response => response.json())
        .then(data => {
            console.log('Driving route response:', data);
            if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
                const route = data.route.paths[0];
                const taxiCost = data.route.taxi_cost;
                console.log('Route found, distance:', route.distance, 'duration:', route.duration, 'taxi cost:', taxiCost);
                
                const distance = parseFloat(route.distance);
                const duration = parseFloat(route.duration);
                const cost = parseFloat(taxiCost);

                if (!isNaN(distance) && !isNaN(duration) && !isNaN(cost)) {
                    return { distance, duration, taxiCost };
                } else {
                    console.error('Invalid data received:', { distance, duration, taxiCost });
                    document.getElementById('distance-info').textContent = '收到的数据无效，无法计算路线信息';
                    return null;
                }
            } else {
                console.log('Unable to calculate route');
                document.getElementById('distance-info').textContent = '无法计算路线';
                return null;
            }
        })
        .catch(error => {
            console.error('Error in driving route request:', error);
            document.getElementById('distance-info').textContent = '路线计算请求失败';
            return null;
        });
}


// 更新距离信息显示
function updateDistanceInfo(distance, duration, taxiCost) {
    console.log('Updating distance info:', distance, 'meters,', duration, 'seconds, taxi cost:', taxiCost);
    const distanceInfo = document.getElementById('distance-info');
    if (distanceInfo) {
        distanceInfo.innerHTML = `
            <p>距离：${(distance / 1000).toFixed(2)} 公里</p>
            <p>预计驾车时间：${Math.round(duration / 60)} 分钟</p>
            <p>预估出租车费用：${taxiCost} 元</p>
        `;
    }
}

// 更新时间筛选器UI
function updateTimeFilterUI() {
    const filterContainer = document.querySelector('.distance-select');
    const slider = document.getElementById('distance');
    const valueDisplay = document.getElementById('distance-value');
    
    if (filterContainer && slider && valueDisplay) {
        if (nearestLocation) {
            filterContainer.style.display = 'block';
            if (directDistance) {
                if (directDistances.length > 0) { // 确保有计算结果
                    const maxDistance = Math.max(...directDistances.map(d => d.distance));
                    slider.max = Math.min(40, maxDistance)// 设置最大直线距离
                    slider.value = 10; // 设置默认值
                    valueDisplay.textContent = `${slider.value} km 直线距离内`; // 更新单位
                    
                } else {
                    filterContainer.style.display = 'none'; // 如果没有计算结果，隐藏滑块
                }
            } else {
                // 现有逻辑
                const timeColumn = `${nearestLocation}时间`;
                const times = restaurants.map(r => parseInt(r[timeColumn])).filter(t => !isNaN(t));
                const maxTime = Math.max(...times);
                slider.max = Math.min(120, maxTime);
                let defaultValue = maxTime < 30 ? Math.round(maxTime / 2) : 30;
                slider.value = defaultValue;
                valueDisplay.textContent = `${defaultValue} min 车程内`;
            }
            console.log('Time filter UI updated');
            updateRestaurantCount(); // 更新餐厅数量
        } else {
            filterContainer.style.display = 'none';
            console.log('Time filter UI hidden: nearestLocation not set');
        }
    } else {
        console.warn('Time filter UI elements not found');
    }
}

// 更新滑块显示
function updateSlider() {
    const slider = document.getElementById('distance');
    const output = document.getElementById('distance-value');
    if (slider && output) {
        const value = slider.value;
        output.textContent = directDistance ? `${value} km 直线距离内` : `${value} min 车程内`; // 更新单位
        // 更新滑块的背景颜色
        updateSliderBackground(slider);
        console.log('Slider updated:', value);
        
        // 每次滑块更新时都更新餐厅计数
        updateRestaurantCount();
    } else {
        console.warn('Slider elements not found');
    }
}

// 新增函数：更新滑块背景
function updateSliderBackground(slider) {
    const min = parseInt(slider.min);
    const max = parseInt(slider.max);
    const value = parseInt(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    const backgroundStyle = `linear-gradient(to right, #007AFF 0%, #007AFF ${percentage}%, #D1D1D6 ${percentage}%, #D1D1D6 100%)`;
    slider.style.background = backgroundStyle;
    
    // 强制重绘
    slider.offsetWidth;
    
    console.log('Slider background updated:', backgroundStyle);
    updateDebugInfo();
}

// 更新城市列表
function updateCityList(userCity) {
    const citySet = new Set(['所有城市']);
    restaurants.forEach(r => citySet.add(formatCityName(r.city)));
    if (userCity) citySet.add(formatCityName(userCity));

    const cities = Array.from(citySet).sort();
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = ''; // 清空现有选项
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
    console.log('City list updated. Available cities:', cities);
}

// 更新城市选择器
function updateCitySelect(city) {
    const citySelect = document.getElementById('city');
    const selectedCitySpan = document.querySelector('.selected-city');
    if (citySelect && selectedCitySpan) {
        const formattedCity = formatCityName(city);
        let matchFound = false;

        // 遍历所有选项,查找匹配的城市
        for (let i = 0; i < citySelect.options.length; i++) {
            const option = citySelect.options[i];
            if (compareCityNames(formatCityName(option.value), formattedCity)) {
                citySelect.value = option.value;
                selectedCitySpan.textContent = option.value;
                matchFound = true;
                break;
            }
        }

        // 如果没有找到匹配的城市,设置为"所有城市"
        if (!matchFound) {
            citySelect.value = '所有城市';
            selectedCitySpan.textContent = '所有城市';
        }
        
        updateDistanceFilterVisibility();
        updateRestaurantCount(); // 更新餐厅数量
    }
}

// 过滤餐厅的通用函数
function filterRestaurants(maxDistance) {
    const selectedCity = formatCityName(document.querySelector('.selected-city').textContent);
    const filterContainer = document.querySelector('.distance-select');
    
    return restaurants.filter(r => {
        const cityMatch = selectedCity === '所有城市' || compareCityNames(formatCityName(r.city), selectedCity);
        
        if (filterContainer.style.display === 'none') {
            return cityMatch;
        }
        
        if (directDistance) {
            const restaurantDistance = directDistances.find(d => d.name === r.name)?.distance;
            return cityMatch && restaurantDistance && restaurantDistance <= maxDistance;
        } else {
            const timeColumn = `${nearestLocation}时间`;
            return cityMatch && parseInt(r[timeColumn]) <= maxDistance;
        }
    });
}

// 更新餐厅数量显示
function updateRestaurantCount() {
    const countElement = document.querySelector('#restaurant-count .number');
    const cityElement = document.querySelector('.selected-city');
    const slider = document.getElementById('distance');
    
    if (countElement && cityElement && slider) {
        const maxDistance = parseInt(slider.value); // 使用滑块的值作为最大距离
        const filteredRestaurants = filterRestaurants(maxDistance); // 调用过滤函数

        countElement.textContent = filteredRestaurants.length; // 更新餐厅数量
        console.log('Restaurant count updated:', filteredRestaurants.length, 'for city:', cityElement.textContent, 'within', maxDistance, 'km');
    } else {
        console.warn('Restaurant count, city element, or slider not found');
    }
}

// 随机选择餐厅
function selectRandomRestaurant() {
    const cityElement = document.querySelector('.selected-city');
    const slider = document.getElementById('distance');
    if (cityElement && slider && nearestLocation) {
        const maxDistance = parseInt(slider.value);
        const filteredRestaurants = filterRestaurants(maxDistance); // 调用过滤函数

        if (filteredRestaurants.length === 0) {
            console.log('No restaurants available with current filters');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
        const selectedRestaurant = filteredRestaurants[randomIndex];
        console.log('Randomly selected restaurant:', selectedRestaurant);
        return selectedRestaurant;
    } else {
        console.warn('City element, slider, or nearestLocation not found');
        return null;
    }
}

// 将URL转换为移动端友好的格式
function convertToMobileUrl(url) {
    if (!url) return '#';
    return url.replace('https://www.dianping.com/shop/', 'https://m.dianping.com/shopshare/');
}

// 辅助函数：格式化城市名称
function formatCityName(city) {
    if (!city) return '所有城市';
    city = Array.isArray(city) ? city[0] : city;
    return city.replace(/[\[\]]/g, '').trim(); // 只移除方括号和空白字符
}

// 新增函数：比较城市名称
function compareCityNames(name1, name2) {
    return name1.slice(0, 2) === name2.slice(0, 2);
}

// 新增函数：控制距离滑块的显示
function updateDistanceFilterVisibility() {
    console.log('Updating distance filter visibility');
    const filterContainer = document.querySelector('.distance-select');
    const selectedCity = formatCityName(document.querySelector('.selected-city').textContent);
    const slider = document.getElementById('distance');
    
    console.log('User city:', userCity);
    console.log('Selected city:', selectedCity);
    console.log('Direct distance:', directDistance);
    
    if (userCity && compareCityNames(userCity, selectedCity)) {
        console.log('Showing distance filter');
        filterContainer.style.display = 'block';
        slider.value = directDistance ? "10" : "30";
        
        // 使用 setTimeout 确保在 DOM 更新后更新背景
        setTimeout(() => {
            updateSliderBackground(slider);
            updateTimeFilterUI(); // 更新滑块UI
        }, 0);
    } else {
        console.log('Hiding distance filter');
        filterContainer.style.display = 'none';
    }
    updateRestaurantCount(); // 更新餐厅数量
    updateDebugInfo();
}

// 初始化函数
function init() {
    initCount++;
    console.log('Initializing... Count:', initCount);
    
    loadDefaultCSV();
    requestUserLocation();
    
    // 使用 setTimeout 来确保在其他异步操作完成后初始化滑块
    setTimeout(() => {
        const slider = document.getElementById('distance');
        if (slider) {
            console.log('Setting initial slider value');
            slider.value = directDistance ? "10" : "30";
            updateSliderBackground(slider);
            updateSlider();
            slider.oninput = updateSlider;
        }
        updateDebugInfo();
    }, 0);
    
    // 添加机选择按钮的事件监听器
    const randomSelectButton = document.getElementById('random-select');
    if (randomSelectButton) {
        randomSelectButton.addEventListener('click', () => {
            const restaurant = selectRandomRestaurant();
            if (restaurant) {
                console.log('Selected restaurant:', restaurant);
                getRestaurantLocationAndCalculateDistance(restaurant);
            } else {
                console.log('No restaurant selected');
            }
        });
    }

    // 添加更新地址按钮的事件监听器
    const updateLocationButton = document.querySelector('.location-select');
    if (updateLocationButton) {
        updateLocationButton.addEventListener('click', searchLocation);
    }

    // 添加城市选择事件监听器
    const citySelect = document.getElementById('city');
    citySelect.addEventListener('change', function() {
        updateCitySelect(this.value);
        updateDistanceFilterVisibility();
    });

    // 初始化城市列表
    updateCityList();
    
    updateDebugInfo();
}

function createHistoryCard(restaurant, distance, duration, taxiCost) {
    const daysSinceFavorited = calculateDaysSinceFavorited(restaurant.time);
    const cardHtml = `
        <div class="history-card">
            <h3>${restaurant.name}</h3>
            <p>${restaurant.address}</p>
            <p>距离: ${Math.round(distance / 1000)} 公里</p>
            <p>预计驾车时间: ${Math.round(duration / 60)} 分钟</p>
            <p>预计打车费: ${Math.round(taxiCost)} 元</p>
            <p>收藏天数: ${daysSinceFavorited} 天</p>
            <div class="card-actions">
                <a href="${restaurant.url}" target="_blank" class="dianping-link">去大众点评查看</a>
                <button class="delete-card" aria-label="删除">&times;</button>
            </div>
        </div>
    `;
    return cardHtml;
}

function calculateDaysSinceFavorited(favoriteDate) {
    const today = new Date();
    const favDate = new Date(favoriteDate);
    const diffTime = Math.abs(today - favDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function addToHistory(restaurant, distance, duration, taxiCost) {
    const historyCards = document.getElementById('history-cards');
    const cardHtml = createHistoryCard(restaurant, distance, duration, taxiCost);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    const card = tempDiv.firstElementChild;
    
    // 添加删除按钮的事件监听器
    const deleteButton = card.querySelector('.delete-card');
    deleteButton.addEventListener('click', function() {
        card.remove();
    });
    
    historyCards.insertBefore(card, historyCards.firstChild);
}

function updateDebugInfo() {
    const slider = document.getElementById('distance');
    const debugSliderValue = document.getElementById('debug-slider-value');
    const debugDirectDistance = document.getElementById('debug-direct-distance');
    const debugSliderBackground = document.getElementById('debug-slider-background');
    const debugInitCount = document.getElementById('debug-init-count');

    if (slider) {
        if (debugSliderValue) debugSliderValue.textContent = slider.value;
        if (debugSliderBackground) debugSliderBackground.textContent = slider.style.background;
    }

    if (debugDirectDistance) debugDirectDistance.textContent = directDistance;
    if (debugInitCount) debugInitCount.textContent = initCount;

    console.log('Debug info updated:', {
        sliderValue: slider ? slider.value : 'N/A',
        directDistance,
        sliderBackground: slider ? slider.style.background : 'N/A',
        initCount
    });
}

// 当 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 其他现有的函数（如 selectRandomRestaurant）保持不变