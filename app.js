// DOM Elements
const cryptoGrid = document.getElementById('cryptoGrid');
const priceChart = document.getElementById('priceChart');
const selectedCryptoName = document.getElementById('selectedCryptoName');
const toggleView = document.getElementById('toggleView');
const themeToggle = document.getElementById('themeToggle');
const downloadReport = document.getElementById('downloadReport');
const body = document.body;

// Configuration
const cryptocurrencies = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'Binance Coin' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' }
];

// State
let cryptoData = {};
let selectedCrypto = 'BTC';
let displayHourly = true;
let chart;
let socket;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Initialize WebSocket connection
function initWebSocket() {
  const symbols = cryptocurrencies.map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join('/');
  socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols}`);

  socket.onmessage = (event) => {
    const { data } = JSON.parse(event.data);
    const symbol = data.s.replace('USDT', '');
    const price = parseFloat(data.c).toFixed(2);
    const change24h = parseFloat(data.p).toFixed(2);
    const isPositive = change24h >= 0;
    
    if (cryptoData[symbol]) {
      cryptoData[symbol].price = price;
      cryptoData[symbol].change24h = change24h;
      cryptoData[symbol].isPositive = isPositive;
    } else {
      cryptoData[symbol] = { price, change24h, isPositive };
    }

    updateCryptoCard(symbol);
    
    if (symbol === selectedCrypto) {
      updateChart();
    }
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting...');
    setTimeout(initWebSocket, 1000);
  };
}

// Initialize the crypto dashboard
function initDashboard() {
  cryptoGrid.innerHTML = '';
  cryptocurrencies.forEach(crypto => {
    const isFavorite = favorites.includes(crypto.symbol);
    const card = document.createElement('div');
    card.className = `crypto-card ${crypto.symbol === selectedCrypto ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="crypto-header">
        <span class="crypto-name">${crypto.name}</span>
        <span class="favorite ${isFavorite ? 'active' : ''}">${isFavorite ? '★' : '☆'}</span>
      </div>
      <div class="crypto-price">$0.00</div>
      <div class="crypto-change">24h: <span class="change-value">0.00%</span></div>
    `;
    card.dataset.symbol = crypto.symbol;
    
    // Click handler for selecting crypto
    card.addEventListener('click', () => {
      document.querySelector('.crypto-card.selected')?.classList.remove('selected');
      card.classList.add('selected');
      selectedCrypto = crypto.symbol;
      selectedCryptoName.textContent = crypto.name;
      updateChart();
    });
    
    // Favorite toggle
    const favoriteEl = card.querySelector('.favorite');
    favoriteEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const symbol = card.dataset.symbol;
      const isFavorite = favoriteEl.classList.contains('active');
      
      if (isFavorite) {
        favorites = favorites.filter(f => f !== symbol);
        favoriteEl.classList.remove('active');
        favoriteEl.textContent = '☆';
      } else {
        favorites.push(symbol);
        favoriteEl.classList.add('active');
        favoriteEl.textContent = '★';
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
    });
    
    cryptoGrid.appendChild(card);
  });
  
  // Initialize chart
  initChart();
}

// Initialize the chart
function initChart() {
  if (chart) {
    chart.destroy();
  }
  
  const ctx = priceChart.getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Price (USD)',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

// Update crypto card data
function updateCryptoCard(symbol) {
  const card = document.querySelector(`.crypto-card[data-symbol="${symbol}"]`);
  if (card && cryptoData[symbol]) {
    const data = cryptoData[symbol];
    const priceEl = card.querySelector('.crypto-price');
    const changeEl = card.querySelector('.change-value');
    
    priceEl.textContent = `$${data.price}`;
    changeEl.textContent = `${data.isPositive ? '+' : ''}${data.change24h}%`;
    changeEl.className = data.isPositive ? 'change-positive' : 'change-negative';
  }
}

// Update chart with historical data
async function updateChart() {
  if (!selectedCrypto) return;
  
  try {
    // Use full URL to backend server to avoid CORS issues when opening file://
    const response = await fetch(`http://localhost:3000/api/historical/${selectedCrypto}`);
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) return;
    
    const prices = data.map(item => parseFloat(item[4])); // Closing price
    const labels = data.map((_, i) => {
      if (displayHourly) {
        return `${i}h`;
      } else {
        return new Date(i * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit' });
      }
    });
    
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = prices;
      chart.update();
    }
  } catch (error) {
    console.error('Error updating chart:', error);
  }
}

// Event Listeners
toggleView.addEventListener('click', () => {
  displayHourly = !displayHourly;
  toggleView.textContent = displayHourly ? 'Switch to 1H View' : 'Switch to 24H View';
  updateChart();
});

themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

downloadReport.addEventListener('click', () => {
  const reportData = cryptocurrencies.map(crypto => ({
    symbol: crypto.symbol,
    name: crypto.name,
    price: cryptoData[crypto.symbol]?.price || 'N/A',
    change24h: cryptoData[crypto.symbol]?.change24h || 'N/A'
  }));
  
  // Use full URL to backend server to avoid CORS issues when opening file://
  fetch('http://localhost:3000/api/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: reportData })
  })
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crypto_report.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  })
  .catch(error => console.error('Error downloading report:', error));
});

// Initialize
if (localStorage.getItem('theme') === 'dark') {
  body.classList.add('dark-mode');
}

initDashboard();
initWebSocket();

// Sample crypto data for initial display
cryptocurrencies.forEach(crypto => {
  cryptoData[crypto.symbol] = {
    price: '0.00',
    change24h: '0.00',
    isPositive: true
  };
});
