require('dotenv').config();

const path = require('path');
const express = require('express');
const { connectDB } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDir, { index: false }));

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
