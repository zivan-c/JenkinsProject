require('dotenv').config();

const path = require('path');
const express = require('express');
const client = require('prom-client'); //for monitoring
const { connectDB } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

//section for metrics tracking
const register = new client.Registry();

client.collectDefaultMetrics({
  register
});

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});



const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

app.use((req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(startTime);
    const duration = elapsed[0] + elapsed[1] / 1e9;

    const route = req.route?.path || req.path || 'unknown';
    const statusCode = res.statusCode.toString();

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode
      },
      duration
    );
  });

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDir, { index: false }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', taskRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found.' });
  }

  return res.status(404).send('Page not found.');
});

app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Could not start server:', error.message);
    process.exit(1);
  });
}

module.exports = app;
