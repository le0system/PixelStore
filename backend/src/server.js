import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Database, defaultDatabaseFile } from './database.js';
import { ApiError, GameRepository, UserRepository, OrderRepository } from './repositories.js';

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 65536) throw new ApiError(413, 'Requisição muito grande.');
  }
  try {
    const parsed = JSON.parse(body || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON deve conter objeto');
    return parsed;
  } catch { throw new ApiError(400, 'JSON inválido.'); }
}

const tokenFrom = req => {
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(req.headers.authorization || '');
  return match?.[1] ?? '';
};

export function createApp({ databaseFile = defaultDatabaseFile, environment = process.env.NODE_ENV ?? 'development' } = {}) {
  const database = new Database(databaseFile, { environment });
  const games = new GameRepository(database);
  const users = new UserRepository(database);
  const orders = new OrderRepository(database);
  const server = createHttpServer(async (req, res) => {
    const origin = req.headers.origin || '';
    if (/^http:\/\/(localhost|127\.0\.0\.1):4200$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const path = url.pathname;
      const method = req.method;
      if (path.startsWith('/api/admin/') || (path.startsWith('/api/games') && ['POST','PUT','DELETE'].includes(method))) {
        const user = users.authenticated(tokenFrom(req));
        if (user.role !== 'admin') throw new ApiError(403, 'Acesso permitido apenas para administradores.');
      }
      if (method === 'GET' && path === '/api/admin/stats') {
        const count = table => database.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
        return send(res, 200, { games: count('games'), users: count('users'), orders: count('orders') });
      }
      if (method === 'GET' && path === '/api/admin/orders') return send(res, 200, orders.list());
      if (method === 'POST' && path === '/api/games') return send(res, 201, games.create(await readJson(req)));
      const editMatch = /^\/api\/games\/(\d+)$/.exec(path);
      if (method === 'PUT' && editMatch) return send(res, 200, games.update(Number(editMatch[1]), await readJson(req)));
      if (method === 'DELETE' && editMatch) { games.delete(Number(editMatch[1])); res.writeHead(204); res.end(); return; }
      if (method === 'GET' && path === '/api/health') return send(res, 200, { status: 'ok', database: 'sqlite' });
      if (method === 'GET' && path === '/api/platforms') return send(res, 200, ['PlayStation', 'Xbox', 'Nintendo', 'PC']);
      if (method === 'GET' && path === '/api/games') return send(res, 200,
        games.list({ platform: url.searchParams.get('platform'), q: url.searchParams.get('q')?.trim(), sort: url.searchParams.get('sort') }));
      const gameMatch = /^\/api\/games\/(\d+)$/.exec(path);
      if (method === 'GET' && gameMatch) return send(res, 200, games.find(Number(gameMatch[1])));
      if (method === 'POST' && path === '/api/auth/register') {
        const { name, email, password } = await readJson(req);
        return send(res, 201, users.openSession(users.register(name, email, password)));
      }
      if (method === 'POST' && path === '/api/auth/login') {
        const { email, password } = await readJson(req);
        return send(res, 200, users.openSession(users.login(email, password)));
      }
      if (method === 'GET' && path === '/api/auth/me') return send(res, 200, users.authenticated(tokenFrom(req)));
      if (method === 'POST' && path === '/api/auth/logout') {
        users.logout(tokenFrom(req)); return send(res, 200, { message: 'Sessão encerrada.' });
      }
      if (method === 'GET' && path === '/api/orders') {
        const user = users.authenticated(tokenFrom(req));
        return send(res, 200, orders.list(user.id));
      }
      if (method === 'POST' && path === '/api/orders') {
        const user = users.authenticated(tokenFrom(req));
        const { gameIds, paymentMethod } = await readJson(req);
        return send(res, 201, orders.create(user.id, gameIds, paymentMethod));
      }
      throw new ApiError(404, 'Rota não encontrada.');
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(error);
      send(res, error instanceof ApiError ? error.status : 500,
        { error: error instanceof ApiError ? error.message : 'Erro interno no servidor.' });
    }
  });
  return { server, database };
}

// Inicialização direta; importar createApp nos testes não abre a porta.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3000);
  const { server } = createApp({ databaseFile: process.env.PIXELSTORE_DB || defaultDatabaseFile });
  server.listen(port, () => console.log(`Pixel Store API em http://localhost:${port}/api/health`));
}
