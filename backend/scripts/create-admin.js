import { Database, defaultDatabaseFile } from '../src/database.js';
import { UserRepository } from '../src/repositories.js';

export function createAdmin(database, { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD }) {
  if (typeof ADMIN_PASSWORD !== 'string' || ADMIN_PASSWORD.length < 12)
    throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres.');
  const users = new UserRepository(database);
  database.db.exec('BEGIN IMMEDIATE');
  try {
    if (database.db.prepare("SELECT id FROM users WHERE role='admin'").get())
      throw new Error('Já existe um administrador. Este script cria apenas o primeiro.');
    const user = users.register(ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD);
    database.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
    database.db.exec('COMMIT');
    return { ...user, role: 'admin' };
  } catch (error) { database.db.exec('ROLLBACK'); throw error; }
}

if (process.argv[1]?.endsWith('/scripts/create-admin.js')) {
  const database = new Database(process.env.PIXELSTORE_DB || defaultDatabaseFile, { environment: 'production' });
  try {
    createAdmin(database, process.env);
    console.log('Administrador criado. Entre pelo login da loja.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { database.close(); }
}
