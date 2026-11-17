import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from '../src/database.js';
import { createApp } from '../src/server.js';
import { UserRepository, OrderRepository } from '../src/repositories.js';

const email = 'adm_conta@gmail.com';

test('conta demo usa hash scrypt e não é recriada nem redefinida após reinício', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pixel-demo-'));
  const filename = join(directory, 'db.sqlite');
  try {
    let database = new Database(filename, { environment: 'development' });
    const users = new UserRepository(database);
    const admin = users.login(email, '12345');
    assert.equal(admin.name, 'admin'); assert.equal(admin.role, 'admin');
    const row = database.db.prepare('SELECT * FROM users WHERE id=?').get(admin.id);
    assert.notEqual(row.password_hash, '12345');
    assert.match(row.password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    users.register('Cliente', 'cliente@example.test', 'senha123');
    new OrderRepository(database).create(admin.id, [1], 'pix');
    database.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(users.hashPassword('senha-alterada'), admin.id);
    const changedHash = database.db.prepare('SELECT password_hash FROM users WHERE id=?').get(admin.id).password_hash;
    database.close();
    database = new Database(filename, { environment: 'demo' });
    assert.equal(new UserRepository(database).login(email, 'senha-alterada').id, admin.id);
    assert.equal(database.db.prepare('SELECT password_hash FROM users WHERE id=?').get(admin.id).password_hash, changedHash);
    assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
    assert.equal(new OrderRepository(database).list(admin.id).length, 1);
    assert.ok(database.db.prepare('SELECT COUNT(*) AS n FROM games').get().n > 0);
    database.db.prepare('DELETE FROM sessions').run();
    // Exclusão intencional da conta não deve provocar sua recriação automática.
    database.db.prepare('DELETE FROM order_items').run();
    database.db.prepare('DELETE FROM orders').run();
    database.db.prepare('DELETE FROM users WHERE id=?').run(admin.id);
    database.close();
    database = new Database(filename, { environment: 'development' });
    assert.equal(database.db.prepare('SELECT id FROM users WHERE email=?').get(email), undefined);
    database.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('produção, testes e ambientes desconhecidos não criam conta de demonstração', () => {
  for (const environment of ['production', 'test', 'staging', '']) {
    const database = new Database(':memory:', { environment });
    try {
      assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
      assert.equal(database.db.prepare("SELECT key FROM app_meta WHERE key='demo_admin_seeded'").get(), undefined);
    } finally { database.close(); }
  }
});

test('e-mail já cadastrado não é promovido nem tem senha alterada', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pixel-demo-existing-'));
  const filename = join(directory, 'db.sqlite');
  try {
    let database = new Database(filename, { environment: 'production' });
    const client = new UserRepository(database).register('Cliente original', email, 'senha-original');
    new OrderRepository(database).create(client.id, [1], 'pix');
    database.close();
    database = new Database(filename, { environment: 'development' });
    const user = new UserRepository(database).login(email, 'senha-original');
    assert.equal(user.role, 'cliente'); assert.equal(user.name, 'Cliente original');
    assert.equal(new OrderRepository(database).list(client.id).length, 1);
    database.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('login automático de demonstração dá acesso ao painel e ao CRUD completo sem script', async () => {
  const { server, database } = createApp({ databaseFile: ':memory:', environment: 'demo' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token;
  const request = (path, method = 'GET', body) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  try {
    const response = await request('/auth/login', 'POST', { email, password: '12345' });
    assert.equal(response.status, 200);
    const session = await response.json(); token = session.token;
    assert.equal(session.user.role, 'admin');
    assert.equal((await request('/auth/me')).status, 200);
    assert.equal((await request('/admin/stats')).status, 200);
    assert.equal((await request('/admin/orders')).status, 200);
    const game = { title: 'Jogo demo', description: 'Demonstração', platform: 'PC', genre: 'Aventura', priceCents: 1000, cover: 'zelda.svg', available: true };
    const created = await request('/games', 'POST', game);
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.ok((await (await request('/games')).json()).some(g => g.id === id));
    assert.equal((await request(`/games/${id}`, 'PUT', { ...game, title: 'Editado demo' })).status, 200);
    assert.equal((await (await request(`/games/${id}`)).json()).title, 'Editado demo');
    assert.equal((await request(`/games/${id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/games/${id}`)).status, 404);
    const registered = await request('/auth/register', 'POST', { name: 'Cliente', email: 'novo@example.test', password: 'senha123', role: 'admin' });
    assert.equal(registered.status, 201);
    const client = await registered.json();
    assert.equal(client.user.role, 'cliente');
    token = client.token;
    assert.equal((await request('/admin/stats')).status, 403);
    assert.equal((await request('/games', 'POST', game)).status, 403);
    assert.equal((await request('/auth/login', 'POST', { email: 'novo@example.test', password: 'senha123' })).status, 200);
    assert.equal((await request('/auth/register', 'POST', { name: 'Cliente', email: 'curta@example.test', password: '12345' })).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); database.close(); }
});
