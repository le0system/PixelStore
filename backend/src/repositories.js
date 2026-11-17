import { randomBytes, scryptSync, createHash, timingSafeEqual } from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export class GameRepository {
  constructor(database) { this.db = database.db; }

  list({ platform, q, sort } = {}) {
    const where = [];
    const params = [];
    if (platform && platform !== 'Todas') {
      if (!['PlayStation', 'Xbox', 'Nintendo', 'PC'].includes(platform)) throw new ApiError(400, 'Plataforma inválida.');
      where.push('platform = ?'); params.push(platform);
    }
    if (q) { where.push('(title LIKE ? OR genre LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const orders = {
      featured: 'featured DESC, title COLLATE NOCASE ASC',
      title: 'title COLLATE NOCASE ASC',
      price_asc: 'price_cents ASC, title ASC',
      price_desc: 'price_cents DESC, title ASC',
      recent: 'release_year DESC, title ASC'
    };
    const order = orders[sort || 'featured'];
    if (!order) throw new ApiError(400, 'Ordenação inválida.');
    const sql = `SELECT id, slug, title, platform, genre, price_cents AS priceCents,
      release_year AS releaseYear, cover, description, featured, available FROM games
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`;
    return this.db.prepare(sql).all(...params).map(g => ({ ...g, featured: !!g.featured, available: !!g.available }));
  }

  find(id) {
    const game = this.db.prepare(`SELECT id, slug, title, platform, genre,
      price_cents AS priceCents, release_year AS releaseYear, cover,
      description, featured, available FROM games WHERE id = ?`).get(id);
    if (!game) throw new ApiError(404, 'Jogo não encontrado.');
    return { ...game, featured: !!game.featured, available: !!game.available };
  }

  validate(data) {
    const text = (key, max) => {
      if (typeof data[key] !== 'string' || !data[key].trim() || data[key].trim().length > max)
        throw new ApiError(400, `Campo ${key} inválido.`);
      return data[key].trim();
    };
    const title = text('title', 200), description = text('description', 10000);
    const genre = text('genre', 100), cover = text('cover', 2000);
    if (!['PlayStation', 'Xbox', 'Nintendo', 'PC'].includes(data.platform)) throw new ApiError(400, 'Plataforma inválida.');
    if (!Number.isSafeInteger(data.priceCents) || data.priceCents < 0 || data.priceCents > 100000000)
      throw new ApiError(400, 'Preço inválido. Envie centavos inteiros.');
    if (typeof data.available !== 'boolean') throw new ApiError(400, 'Disponibilidade inválida.');
    if (data.featured !== undefined && typeof data.featured !== 'boolean') throw new ApiError(400, 'Destaque inválido.');
    const year = data.releaseYear ?? new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1970 || year > 2100) throw new ApiError(400, 'Ano inválido.');
    if (!/^(https?:\/\/[^\s]+|\/?(?:[a-zA-Z0-9_%-]+\/)*[a-zA-Z0-9_.%-]+)$/.test(cover) || cover.includes('..'))
      throw new ApiError(400, 'Use uma URL HTTP(S) ou caminho de imagem válido.');
    return [title, data.platform, genre, data.priceCents, year, cover, description, Number(data.featured ?? false), Number(data.available)];
  }

  create(data) {
    const values = this.validate(data);
    const slug = data.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jogo';
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // IDs não são reutilizados: um carrinho antigo nunca aponta para outro jogo.
      const id = Number(this.db.prepare('INSERT INTO game_ids DEFAULT VALUES').run().lastInsertRowid);
      this.db.prepare(`INSERT INTO games
        (id,slug,title,platform,genre,price_cents,release_year,cover,description,featured,available)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, `${slug}-${randomBytes(8).toString('hex')}`, ...values);
      this.db.exec('COMMIT');
      return this.find(id);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  update(id, data) {
    this.find(id);
    const values = this.validate(data);
    this.db.prepare(`UPDATE games SET title=?,platform=?,genre=?,price_cents=?,release_year=?,cover=?,description=?,featured=?,available=? WHERE id=?`).run(...values, id);
    return this.find(id);
  }

  delete(id) {
    this.find(id);
    this.db.prepare('DELETE FROM games WHERE id=?').run(id);
  }

}

export class UserRepository {
  constructor(database) { this.db = database.db; }

  hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  verifyPassword(password, passwordHash) {
    const [salt, storedHex] = passwordHash.split(':');
    const stored = Buffer.from(storedHex, 'hex');
    const computed = scryptSync(password, salt, stored.length);
    return timingSafeEqual(stored, computed);
  }

  register(name, email, password) {
    name = typeof name === 'string' ? name.trim() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (name.length < 2 || name.length > 100) throw new ApiError(400, 'Informe um nome entre 2 e 100 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) throw new ApiError(400, 'E-mail inválido.');
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new ApiError(400, 'A senha deve ter entre 6 e 128 caracteres.');
    const exists = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) throw new ApiError(409, 'Este e-mail já está cadastrado.');
    const created = this.db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, this.hashPassword(password));
    return { id: Number(created.lastInsertRowid), name, email, role: 'cliente' };
  }

  login(email, password) {
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || typeof password !== 'string' || !this.verifyPassword(password, user.password_hash))
      throw new ApiError(401, 'E-mail ou senha incorretos.');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  openSession(user) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    this.db.prepare('INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)').run(tokenHash, user.id);
    return { user, token };
  }

  authenticated(token) {
    if (!token) throw new ApiError(401, 'Faça login para continuar.');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = this.db.prepare(`SELECT users.id, users.name, users.email, users.role FROM sessions
      JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?`).get(tokenHash);
    if (!user) throw new ApiError(401, 'Sessão inválida. Faça login novamente.');
    return user;
  }

  logout(token) {
    if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(createHash('sha256').update(token).digest('hex'));
  }
}

export class OrderRepository {
  constructor(database) { this.db = database.db; this.games = new GameRepository(database); }

  list(userId) {
    const orders = this.db.prepare(`SELECT id, payment_method AS paymentMethod, total_cents AS totalCents,
      status, created_at AS createdAt, user_id AS userId FROM orders ${userId === undefined ? '' : 'WHERE user_id = ?'} ORDER BY id DESC`).all(...(userId === undefined ? [] : [userId]));
    const items = this.db.prepare(`SELECT game_id AS gameId, title, platform, price_cents AS priceCents
      FROM order_items WHERE order_id = ?`);
    return orders.map(order => ({ ...order, items: items.all(order.id) }));
  }

  create(userId, gameIds, paymentMethod) {
    if (!Array.isArray(gameIds) || gameIds.length === 0 || gameIds.length > 30 ||
        gameIds.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(gameIds).size !== gameIds.length)
      throw new ApiError(400, 'Carrinho inválido. Envie jogos distintos.');
    if (!['pix', 'cartao'].includes(paymentMethod)) throw new ApiError(400, 'Forma de pagamento inválida.');
    // Recalcula os valores no servidor: o front-end nunca define o preço do pedido.
    const games = gameIds.map(id => this.games.find(id));
    if (games.some(game => !game.available)) throw new ApiError(400, 'Um jogo do carrinho está indisponível.');
    const total = games.reduce((sum, game) => sum + game.priceCents, 0);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`INSERT INTO orders (user_id, payment_method, total_cents)
        VALUES (?, ?, ?)`).run(userId, paymentMethod, total);
      const orderId = Number(result.lastInsertRowid);
      const insert = this.db.prepare(`INSERT INTO order_items
        (order_id, game_id, title, platform, price_cents) VALUES (?, ?, ?, ?, ?)`);
      for (const game of games) insert.run(orderId, game.id, game.title, game.platform, game.priceCents);
      this.db.exec('COMMIT');
      return this.list(userId).find(order => order.id === orderId);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
