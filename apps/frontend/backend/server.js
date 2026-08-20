const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';

// CORS configuration - allow frontend to access backend
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'carelim-backend', port: PORT });
});

// Proxy all /api/* requests to the Next.js app
app.use('/api', async (req, res) => {
  try {
    const url = `${TARGET_URL}/api${req.url}`;
    const options = {
      method: req.method,
      headers: { ...req.headers },
    };

    // Remove host header to avoid conflicts
    delete options.headers.host;
    delete options.headers.origin;

    // Handle body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
      options.headers['Content-Type'] = options.headers['content-type'] || 'application/json';
    }

    const response = await fetch(url, options);
    const data = await response.text();

    // Forward response
    res.status(response.status);
    // Copy relevant headers
    response.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding' && key !== 'connection') {
        res.setHeader(key, value);
      }
    });
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Backend proxy error', message: err.message });
    }
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Proxy all non-API requests to the Next.js frontend (for IDE preview compatibility)
app.use(async (req, res) => {
  try {
    const url = `${TARGET_URL}${req.url}`;
    const options = {
      method: req.method,
      headers: { ...req.headers },
    };
    delete options.headers.host;
    delete options.headers.origin;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
      options.headers['Content-Type'] = options.headers['content-type'] || 'application/json';
    }
    const response = await fetch(url, options);
    const data = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding' && key !== 'connection' && key !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Backend proxy error', message: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`[Backend] Carelim Backend API server running on http://localhost:${PORT}`);
  console.log(`[Backend] Proxying /api/* to ${TARGET_URL}`);
  console.log(`[Backend] CORS enabled for ${FRONTEND_URL}`);
});
