// test-analytics.js
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/v1/merchants/36/analytics';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDMsInJvbGUiOjE5LCJpYXQiOjE3NDIwMzk5MzMsImV4cCI6MTc0MjY0NDczM30.Nx6RmnNF1PGPj2hYkgFr4owPeA865GXrKCp3XNjk3qg';

const endpoints = [
  { url: `${BASE_URL}/summary?period=24h`, name: 'Summary' },
  { url: `${BASE_URL}/active-viewers`, name: 'Active Viewers' },
  { url: `${BASE_URL}/detailed?startDate=2025-03-14&endDate=2025-03-15&limit=10`, name: 'Detailed' }
];

async function testEndpoint({ url, name }) {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await response.json();
    console.log(`${name} Response (${response.status}):`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`${name} Error:`, error.message);
  }
}

async function runTests() {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
}

runTests();