const express = require('express');
const axios = require('axios');
const redis = require('redis');

// Create a Redis client
const client = redis.createClient({
  host: 'datasrapper-u2euuu.serverless.use1.cache.amazonaws.com',
  port: 6379,
});

// Handle Redis connection events
client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (err) => {
  console.log('Redis error: ' + err);
});

const app = express();

// Route to fetch and cache API data
app.get('/data', (req, res) => {
  const cacheKey = 'apiData';

  // Check if data is in cache
  client.get(cacheKey, async (err, data) => {
    if (err) {
      return res.status(500).send('Redis error: ' + err);
    }

    if (data) {
      // Return cached data
      return res.send(JSON.parse(data));
    } else {
      // Fetch data from API
      try {
        const response = await axios.get('https://app.spireflow.io/data');
        // Cache the data for 1 hour
        client.setex(cacheKey, 3600, JSON.stringify(response.data));
        return res.send(response.data);
      } catch (error) {
        return res.status(500).send(error.message);
      }
    }
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
