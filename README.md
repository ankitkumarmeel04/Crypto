# CryptoPulse Backend Server

This is a simple Node.js Express server to support the CryptoPulse frontend application.

## Setup

1. Make sure you have Node.js installed.

2. Open a terminal in the `public` directory.

3. Initialize a new Node.js project and install dependencies:

```bash
npm init -y
npm install express axios cors csv-stringify
```

## Running the Server

Run the server with:

```bash
node server.js
```

The server will start on port 3000 by default.

## Usage

- The frontend app expects the server to be running to fetch historical price data and export reports.

- Open `index.html` in a browser (or serve it statically) and use the app with the server running.

## Notes

- The server fetches historical price data from Binance API.

- The export report endpoint generates a CSV file for download.
