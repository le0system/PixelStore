import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

async function withApi(fn) {
  const { server, database } = createApp({ databaseFile: ':memory:', environment: 'test' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try { await fn(base); }
  finally { await new Promise(resolve => server.close(resolve)); database.close(); }
}

const post = (base, url, body, token) => fetch(base + url, {
  method: 'POST', headers: {
    'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {})
  }, body: JSON.stringify(body)
});

test('catálogo inicial, filtro e detalhes', async () => withApi(async base => {
  const response = await fetch(base + '/games?platform=Nintendo&sort=price_asc');
  assert.equal(response.status, 200);
  const games = await response.json();
  assert.ok(games.length >= 4);
  assert.ok(games.every(game => game.platform === 'Nintendo'));
  assert.ok(games.every((game, i) => !i || game.priceCents >= games[i - 1].priceCents));
  assert.equal((await (await fetch(base + '/games/10')).json()).id, 10);
  assert.equal((await fetch(base + '/games/999')).status, 404);
}));

test('cadastro, autenticação, pedido persistido e logout', async () => withApi(async base => {
  const register = await post(base, '/auth/register', { name: 'Aluno Teste', email: 'aluno@example.com', password: 'senha123' });
  assert.equal(register.status, 201);
  const { user, token } = await register.json();
  assert.equal(user.name, 'Aluno Teste');
  assert.equal((await post(base, '/auth/register', { name: 'Outro Aluno', email: 'aluno@example.com', password: 'senha123' })).status, 409);
  assert.equal((await post(base, '/auth/login', { email: 'aluno@example.com', password: 'errada' })).status, 401);
  assert.equal((await fetch(base + '/orders')).status, 401);
  const order = await post(base, '/orders', { gameIds: [1, 10], paymentMethod: 'pix' }, token);
  assert.equal(order.status, 201);
  const created = await order.json();
  assert.equal(created.totalCents, 49980);
  assert.equal(created.status, 'simulado');
  assert.equal(created.items.length, 2);
  const history = await fetch(base + '/orders', { headers: { authorization: `Bearer ${token}` } });
  assert.equal((await history.json()).length, 1);
  assert.equal((await post(base, '/orders', { gameIds: [1, 1], paymentMethod: 'pix' }, token)).status, 400);
  assert.equal((await post(base, '/auth/logout', {}, token)).status, 200);
  assert.equal((await fetch(base + '/auth/me', { headers: { authorization: `Bearer ${token}` } })).status, 401);
}));

test('dados sobrevivem ao fechamento e reabertura do arquivo SQLite', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { Database } = await import('../src/database.js');
  const { UserRepository, OrderRepository } = await import('../src/repositories.js');
  const directory = mkdtempSync(join(tmpdir(), 'pixelstore-test-'));
  const filename = join(directory, 'data.sqlite');
  try {
    const db1 = new Database(filename, { environment: 'test' });
    const user = new UserRepository(db1).register('Teste Persistente', 'persistente@example.com', 'senha123');
    new OrderRepository(db1).create(user.id, [4, 16], 'cartao');
    db1.close();

    const db2 = new Database(filename, { environment: 'test' });
    const loggedInUser = new UserRepository(db2).login('persistente@example.com', 'senha123');
    const orders = new OrderRepository(db2).list(loggedInUser.id);
    assert.equal(orders.length, 1);
    assert.equal(orders[0].items.length, 2);
    assert.equal(orders[0].totalCents, 38980);
    db2.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
