import { UserRepository } from './repositories.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seedFile = resolve(here, '../data/jogos.json');
export const defaultDatabaseFile = resolve(here, '../data/pixelstore.sqlite');

/** Repositório SQLite centralizado para facilitar manutenção e testes. */
export class Database {
  constructor(filename = defaultDatabaseFile, { environment = process.env.NODE_ENV ?? 'development' } = {}) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (filename !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL;');
    this.migrate();
    this.seed();
    this.seedDemoAdmin(environment);
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('PlayStation','Xbox','Nintendo','PC')),
        genre TEXT NOT NULL,
        price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
        release_year INTEGER NOT NULL,
        cover TEXT NOT NULL,
        description TEXT NOT NULL,
        featured INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        payment_method TEXT NOT NULL,
        total_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'simulado',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id),
        title TEXT NOT NULL,
        platform TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        UNIQUE(order_id, game_id)
      );
    `);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare('PRAGMA table_info(users)').all().some(c => c.name === 'role'))
        this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('cliente','admin'))");
      if (!this.db.prepare('PRAGMA table_info(games)').all().some(c => c.name === 'available'))
        this.db.exec('ALTER TABLE games ADD COLUMN available INTEGER NOT NULL DEFAULT 1 CHECK(available IN (0,1))');
      // Histórico mantém título, plataforma e preço mesmo após exclusão física do jogo.
      if (this.db.prepare('PRAGMA table_info(order_items)').all().find(c => c.name === 'game_id').notnull) {
        this.db.exec(`CREATE TABLE order_items_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
          title TEXT NOT NULL, platform TEXT NOT NULL, price_cents INTEGER NOT NULL,
          UNIQUE(order_id, game_id));
          INSERT INTO order_items_new SELECT * FROM order_items;
          DROP TABLE order_items;
          ALTER TABLE order_items_new RENAME TO order_items;`);
      }
      this.db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY)');
      this.db.exec('CREATE TABLE IF NOT EXISTS game_ids (id INTEGER PRIMARY KEY AUTOINCREMENT)');
      this.db.exec('INSERT OR IGNORE INTO game_ids (id) SELECT MAX(id) FROM games HAVING MAX(id) IS NOT NULL');
      // Um banco legado já populado não deve receber o catálogo novamente.
      if (this.db.prepare('SELECT COUNT(*) AS n FROM games').get().n)
        this.db.exec("INSERT OR IGNORE INTO app_meta VALUES ('catalog_seeded')");
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  seed() {
    if (this.db.prepare("SELECT key FROM app_meta WHERE key = 'catalog_seeded'").get()) return;
    const games = JSON.parse(readFileSync(seedFile, 'utf8'));
    const insert = this.db.prepare(`INSERT INTO games
      (id, slug, title, platform, genre, price_cents, release_year, cover, description, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    this.db.exec('BEGIN');
    try {
      for (const game of games) insert.run(
        game.id, game.slug, game.title, game.platform, game.genre, game.priceCents,
        game.releaseYear, game.cover, game.description, Number(game.featured)
      );
      this.db.exec('INSERT OR IGNORE INTO game_ids (id) SELECT MAX(id) FROM games');
      this.db.exec("INSERT INTO app_meta VALUES ('catalog_seeded')");
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  seedDemoAdmin(environment) {
    // Lista explícita: produção, testes e ambientes desconhecidos nunca recebem a conta.
    if (!['development', 'demo'].includes(environment)) return;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare("SELECT key FROM app_meta WHERE key='demo_admin_seeded'").get()) {
        const email = 'adm_conta@gmail.com';
        const existing = this.db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
        if (!existing) {
          const hash = new UserRepository(this).hashPassword('12345');
          this.db.prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')")
            .run('admin', email, hash);
        } else {
          console.warn('Conta de demonstração não criada: o e-mail adm_conta@gmail.com já existe. A conta existente foi preservada.');
        }
        this.db.exec("INSERT INTO app_meta VALUES ('demo_admin_seeded')");
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  close() { this.db.close(); }
}
