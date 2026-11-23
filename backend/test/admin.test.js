import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { Database } from '../src/database.js';
import { createApp } from '../src/server.js';
import { createAdmin } from '../scripts/create-admin.js';
import { GameRepository, UserRepository, OrderRepository } from '../src/repositories.js';

const credentials = { ADMIN_NAME: 'Administrador', ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'senha-de-teste-12345' };
const game = { title: 'Teste CRUD', description: 'Descrição do jogo', platform: 'PC', genre: 'Aventura',
  priceCents: 12345, cover: 'https://example.test/cover.png', available: true, featured: true, releaseYear: 2026 };

test('API administrativa: autenticação, permissões, CRUD, validação e pedidos históricos', async () => {
  const { server, database } = createApp({ databaseFile: ':memory:', environment: 'test' });
  createAdmin(database, credentials);
  assert.throws(() => createAdmin(database, credentials), /Já existe/);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, method = 'GET', body, token) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  try {
    const login = await request('/auth/login', 'POST', { email: credentials.ADMIN_EMAIL, password: credentials.ADMIN_PASSWORD });
    assert.equal(login.status, 200);
    const admin = await login.json();
    assert.equal(admin.user.role, 'admin');
    const registration = await request('/auth/register', 'POST', { name: 'Cliente', email: 'cliente@example.test', password: 'senha123', role: 'admin' });
    const client = await registration.json();
    assert.equal(client.user.role, 'cliente');
    const clientLogin = await request('/auth/login', 'POST', { email: client.user.email, password: 'senha123' });
    assert.equal((await clientLogin.json()).user.role, 'cliente');
    for (const [path, method, body] of [
      ['/admin/stats', 'GET'], ['/admin/orders', 'GET'], ['/games', 'POST', game],
      ['/games/1', 'PUT', game], ['/games/1', 'DELETE']
    ]) {
      assert.equal((await request(path, method, body)).status, 401);
      assert.equal((await request(path, method, body, client.token)).status, 403);
    }
    for (const invalid of [{ priceCents: -1 }, { priceCents: 1.5 }, { title: ' ' }, { platform: 'Mobile' }, { available: 'true' }, { cover: 'javascript:alert(1)' }])
      assert.equal((await request('/games', 'POST', { ...game, ...invalid }, admin.token)).status, 400);
    const created = await request('/games', 'POST', game, admin.token);
    assert.equal(created.status, 201);
    const saved = await created.json();
    assert.equal((await (await request('/games?q=Teste%20CRUD&platform=PC')).json())[0].id, saved.id);
    const bought = await request('/orders', 'POST', { gameIds: [saved.id], paymentMethod: 'pix' }, client.token);
    assert.equal(bought.status, 201);
    const edited = await request(`/games/${saved.id}`, 'PUT', { ...game, title: 'Editado', priceCents: 999, available: false }, admin.token);
    assert.equal(edited.status, 200);
    assert.equal((await (await request(`/games/${saved.id}`)).json()).title, 'Editado');
    assert.equal((await request('/orders', 'POST', { gameIds: [saved.id], paymentMethod: 'pix' }, client.token)).status, 400);
    const stats = await (await request('/admin/stats', 'GET', undefined, admin.token)).json();
    assert.equal(stats.users, 2); assert.equal(stats.orders, 1); assert.ok(stats.games > 1);
    assert.equal((await request(`/games/${saved.id}`, 'DELETE', undefined, admin.token)).status, 204);
    assert.equal((await request(`/games/${saved.id}`)).status, 404);
    assert.equal((await request(`/games/${saved.id}`, 'DELETE', undefined, admin.token)).status, 404);
    assert.equal((await request(`/games/${saved.id}`, 'PUT', game, admin.token)).status, 404);
    const history = await (await request('/admin/orders', 'GET', undefined, admin.token)).json();
    assert.equal(history[0].items[0].title, game.title);
    assert.equal(history[0].items[0].priceCents, game.priceCents);
    assert.equal(history[0].items[0].gameId, null);
    assert.equal((await request('/orders', 'POST', { gameIds: [saved.id], paymentMethod: 'pix' }, client.token)).status, 404);
    const newGame = await (await request('/games', 'POST', game, admin.token)).json();
    assert.ok(newGame.id > saved.id);
    const preflight = await fetch(base + '/games/1', { method: 'OPTIONS', headers: { Origin: 'http://localhost:4200' } });
    assert.match(preflight.headers.get('access-control-allow-methods'), /PUT,DELETE/);
    database.db.prepare("UPDATE users SET role='cliente' WHERE id=?").run(admin.user.id);
    assert.equal((await request('/admin/stats', 'GET', undefined, admin.token)).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); database.close(); }
});

test('CRUD e catálogo vazio persistem após reinício; administrador não promove conta existente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pixel-admin-'));
  const filename = join(dir, 'db.sqlite');
  try {
    let db = new Database(filename, { environment: 'test' });
    const users = new UserRepository(db);
    users.register('Cliente existente', credentials.ADMIN_EMAIL, 'senha123');
    assert.throws(() => createAdmin(db, credentials), /cadastrado/);
    assert.equal(users.login(credentials.ADMIN_EMAIL, 'senha123').role, 'cliente');
    createAdmin(db, { ...credentials, ADMIN_EMAIL: 'outro@example.test' });
    let games = new GameRepository(db);
    const saved = games.create(game);
    games.update(saved.id, { ...game, title: 'Persistente' });
    new OrderRepository(db).create(1, [saved.id], 'pix');
    db.close();
    db = new Database(filename, { environment: 'test' }); games = new GameRepository(db);
    assert.equal(games.find(saved.id).title, 'Persistente');
    assert.equal(new UserRepository(db).login('outro@example.test', credentials.ADMIN_PASSWORD).role, 'admin');
    for (const item of games.list()) games.delete(item.id);
    db.close();
    db = new Database(filename, { environment: 'test' }); games = new GameRepository(db);
    assert.deepEqual(games.list(), []);
    assert.equal(new OrderRepository(db).list(1)[0].items[0].title, 'Persistente');
    assert.ok(games.create(game).id > saved.id);
    assert.deepEqual(db.db.prepare('PRAGMA foreign_key_check').all(), []);
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('atualiza capas antigas dos jogos existentes sem sobrescrever personalizações', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pixel-capas-'));
  const filename = join(dir, 'db.sqlite');
  const options = { environment: 'test' };
  try {
    const initial = new Database(filename, options);
    initial.db.exec(`
      DELETE FROM app_meta WHERE key = 'catalog_covers_webp';
      UPDATE games SET cover = 'horizon.svg', price_cents = 9900 WHERE id = 1;
      UPDATE games SET cover = 'assets/covers/spider.svg' WHERE id = 3;
      UPDATE games SET cover = 'assets/games/ori-and-the-will-of-the-wisps.jpg' WHERE id = 8;
      UPDATE games SET cover = 'assets/games/super-mario-odyssey.avif' WHERE id = 9;
      UPDATE games SET cover = 'assets/covers/minha-capa.png' WHERE id = 10;
      DELETE FROM games WHERE id = 11;
    `);
    initial.close();

    const migrated = new Database(filename, options);
    try {
      const games = new GameRepository(migrated);
      assert.equal(games.find(1).cover, 'assets/games/horizon-forbidden-west.webp');
      assert.equal(games.find(1).priceCents, 9900);
      assert.equal(games.find(3).cover, 'assets/games/spider-man-2.webp');
      assert.equal(games.find(8).cover, 'assets/games/ori.webp');
      assert.equal(games.find(9).cover, 'assets/games/Super-Mario-Odyssey.webp');
      assert.equal(games.find(10).cover, 'assets/covers/minha-capa.png');
      assert.equal(games.list().some(item => item.id === 11), false);
      migrated.db.exec("UPDATE games SET cover = 'horizon.svg' WHERE id = 1");
    } finally { migrated.close(); }

    const restarted = new Database(filename, options);
    try {
      assert.equal(new GameRepository(restarted).find(1).cover, 'horizon.svg');
    } finally { restarted.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('migração de banco legado preserva usuários, sessões e pedidos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pixel-legacy-'));
  const filename = join(dir, 'db.sqlite');
  try {
    // Monta o esquema anterior, sem role/available e com FK obrigatória.
    let db = new Database(filename, { environment: 'test' });
    const user = new UserRepository(db).register('Legado', 'legado@example.test', 'senha123');
    const session = new UserRepository(db).openSession(user);
    new OrderRepository(db).create(user.id, [1], 'pix');
    db.close();
    const raw = new DatabaseSync(filename);
    raw.exec(`ALTER TABLE users DROP COLUMN role; ALTER TABLE games DROP COLUMN available;
      CREATE TABLE old_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id), title TEXT NOT NULL, platform TEXT NOT NULL, price_cents INTEGER NOT NULL, UNIQUE(order_id, game_id));
      INSERT INTO old_items SELECT * FROM order_items; DROP TABLE order_items; ALTER TABLE old_items RENAME TO order_items;
      DROP TABLE app_meta; DROP TABLE game_ids;`);
    raw.close();
    db = new Database(filename, { environment: 'test' });
    assert.equal(new UserRepository(db).authenticated(session.token).role, 'cliente');
    new GameRepository(db).delete(1);
    assert.equal(new OrderRepository(db).list(user.id)[0].items[0].gameId, null);
    assert.deepEqual(db.db.prepare('PRAGMA foreign_key_check').all(), []);
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
