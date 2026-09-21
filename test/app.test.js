const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, () => {
      base = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => server.close());

test('GET /health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('GET /items returns a list', async () => {
  const res = await fetch(`${base}/items`);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});

test('POST /items creates an item', async () => {
  const res = await fetch(`${base}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test item' })
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual((await res.json()).name, 'Test item');
});

test('POST /items without name returns 400', async () => {
  const res = await fetch(`${base}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(res.status, 400);
});
