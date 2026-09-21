const express = require('express');
const pkg = require('../package.json');

function createApp() {
  const app = express();
  app.use(express.json());

  const items = [{ id: 1, name: 'First item' }];

  app.get('/', (req, res) => {
    res.json({
      app: pkg.name,
      version: pkg.version,
      environment: process.env.APP_ENV || 'local'
    });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/items', (req, res) => res.json(items));

  app.post('/items', (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = { id: items.length + 1, name };
    items.push(item);
    res.status(201).json(item);
  });

  return app;
}

module.exports = { createApp };
