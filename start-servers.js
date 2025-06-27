const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const { stringify } = require('csv-stringify');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Endpoint to fetch historical price data for a given symbol from Binance API
app.get('/api/historical/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase() + 'USDT';
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching historical data:', error.message);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Endpoint to accept report data and return CSV file for download
app.post('/api/report', (req, res) => {
  const reportData = req.body.data;
  if (!reportData || !Array.isArray(reportData)) {
    return res.status(400).json({ error: 'Invalid report data' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="crypto_report.csv"');

  const columns = ['symbol', 'name', 'price', 'change24h'];

  const stringifier = stringify({ header: true, columns: columns });
  stringifier.pipe(res);

  reportData.forEach(row => {
    stringifier.write(row);
  });

  stringifier.end();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:' + PORT + ' in your browser');
});
