const Papa = require('papaparse');
const https = require('https');
const fs = require('fs');

const API_KEY = 'd111bbe935342b4ac8d1707ff6523552';
const RATE_LIMIT = 25; // 设置为比API限制稍低的值

function calculateDistances(inputAddress, selectedCity, inputFilePath, outputFilePath) {
    getUserPosition(inputAddress)
        .then(userPosition => {
            if (!userPosition) {
                console.error('Failed to get user position');
                return;
            }

            const fileContent = fs.readFileSync(inputFilePath, 'utf8');
            const parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
            
            const filteredData = parsedData.data.filter(row => row['city'] && row['city'].replace(/[\[\]]/g, '') === selectedCity);
            
            processInBatches(filteredData, userPosition, inputAddress)
                .then(updatedData => {
                    const csv = Papa.unparse(updatedData);
                    fs.writeFileSync(outputFilePath, csv);
                    console.log(`Updated data has been written to ${outputFilePath}`);
                });
        });
}

function processInBatches(data, userPosition, inputAddress, batchSize = RATE_LIMIT) {
    let results = [];
    let index = 0;

    function processBatch() {
        const batch = data.slice(index, index + batchSize);
        index += batchSize;

        const promises = batch.map(row => {
            const restaurantAddress = `${row['city'].replace(/[\[\]]/g, '')}${row['地址']}`;
            return getRestaurantDistance(userPosition, restaurantAddress)
                .then(distance => ({
                    ...row,
                    [`${inputAddress}距离`]: distance ? `${(distance.distance / 1000).toFixed(2)} km` : 'N/A',
                    [`${inputAddress}时间`]: distance ? `${Math.round(distance.duration / 60)} min` : 'N/A'
                }))
                .catch(error => {
                    console.error(`Error processing restaurant: ${row['名称']}`, error);
                    return {
                        ...row,
                        [`${inputAddress}距离`]: 'Error',
                        [`${inputAddress}时间`]: 'Error'
                    };
                });
        });

        return Promise.all(promises)
            .then(batchResults => {
                results = results.concat(batchResults);
                if (index < data.length) {
                    return new Promise(resolve => setTimeout(() => resolve(processBatch()), 1000));
                }
                return results;
            });
    }

    return processBatch();
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function getUserPosition(address) {
    const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&output=json&key=${API_KEY}`;
    return httpsGet(geocodeUrl)
        .then(data => {
            if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
                const location = data.geocodes[0].location.split(',');
                return {
                    lng: parseFloat(location[0]),
                    lat: parseFloat(location[1])
                };
            }
            throw new Error('Geocoding failed');
        });
}

function getRestaurantDistance(origin, destinationAddress) {
    const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(destinationAddress)}&output=json&key=${API_KEY}`;
    return httpsGet(geocodeUrl)
        .then(data => {
            if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
                const location = data.geocodes[0].location;
                const drivingUrl = `https://restapi.amap.com/v3/direction/driving?origin=${origin.lng},${origin.lat}&destination=${location}&extensions=base&key=${API_KEY}`;
                return httpsGet(drivingUrl);
            }
            throw new Error('Geocoding failed');
        })
        .then(drivingData => {
            if (drivingData.status === '1' && drivingData.route && drivingData.route.paths && drivingData.route.paths.length > 0) {
                const route = drivingData.route.paths[0];
                return {
                    distance: parseFloat(route.distance),
                    duration: parseFloat(route.duration)
                };
            }
            throw new Error('Routing failed');
        });
}

// Usage example
calculateDistances(
    '北京海淀区上地5号咖啡厅',
    '北京',
    'restaurants.csv',
    'restaurants_上地5号_distances.csv'
);