# Pixel Store — Back-end Node.js + SQLite

API sem dependências externas: utiliza módulos nativos de Node.js 22.13+ (`node:http`, `node:crypto`, `node:sqlite`).

Execute:

```bash
npm start
```

A API fica em <http://localhost:3000/api/health>. O banco `data/pixelstore.sqlite` é criado automaticamente.

Testes automatizados:

```bash
npm test
```

`node:sqlite` pode emitir um aviso de API experimental no Node.js 22, sem interromper a execução.


Administração: execute `npm run create-admin` com `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo 12 caracteres) no ambiente. O script aceita apenas o primeiro administrador e não promove contas existentes. Veja o [guia completo](../README.md#administração-e-crud-de-jogos) para leitura segura da senha no Bash, endpoints, migração e testes.

Em desenvolvimento (`NODE_ENV` ausente ou `development`) ou `NODE_ENV=demo`, a API cria uma única vez o administrador `adm_conta@gmail.com`, senha `12345`, nome `admin`. Entre pelo login normal para acessar `/admin`. A senha usa hash scrypt e não é redefinida nos reinícios. Credenciais exclusivas para apresentação: **nunca usar em produção**. Configure `NODE_ENV=production` e não reutilize o banco demo em produção. O script manual continua disponível para bancos sem administrador.
