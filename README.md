# PIXEL STORE 🎮 — Projeto Integrador II | Grupo 13

**Centro Universitário Senac — Campus Santo Amaro**  
**Repositório:** https://github.com/le0system/PixelStore

**Integrantes**
- Leonardo Silva Lima — Back-end
- Vinicius Oliveira Loiola — Front-end e Banco de Dados

## Sobre

E-commerce **acadêmico e demonstrativo** de jogos digitais para **PlayStation, Xbox, Nintendo e PC**. Esta versão transforma os oito wireframes da ficha de prototipagem em uma aplicação funcional usando Angular e uma API Node.js com persistência SQLite.

**IMPORTANTE:** Os preços do catálogo são fictícios. A finalização de pedido salva apenas um registro **simulado**, sem cobrança, integração com meios de pagamento ou entrega de chaves digitais.

### Capas dos jogos

As capas fornecidas para a demonstração acadêmica ficam em `frontend/src/assets/games/`. O catálogo inicial referencia esses arquivos no campo `cover` de `backend/data/jogos.json`.

## Funcionalidades

| Tela | Rota Angular | O que faz |
| --- | --- | --- |
| 01 — Login | `/login` | Entrada com e-mail e senha gravados no SQLite |
| 02 — Cadastro | `/cadastro` | Criação de usuário com validação e hash da senha |
| 03 — Home | `/home` | Destaques e seleção das quatro plataformas |
| 04 — Catálogo | `/catalogo` | Busca, filtro por plataforma e ordenação por preço/nome/ano |
| 05 — Detalhes | `/jogo/:id` | Informações e botão de adicionar ao carrinho |
| 06 — Carrinho | `/carrinho` | Itens e subtotal persistidos no navegador |
| 07 — Checkout | `/checkout` | Cria pedido simulado no banco (exige login) |
| 08 — Perfil | `/perfil` | Dados da conta, pedidos históricos e logout |

## Tecnologias

- **Front-end:** Angular 21, TypeScript, HTML, CSS, Angular Router, `HttpClient`, formulários `ngModel`, componentes standalone e signals.
- **Back-end:** Node.js 22.13+, JavaScript com classes de repositório, servidor HTTP nativo, validação de entrada e APIs REST.
- **Banco de dados:** SQLite via `node:sqlite`, tabelas `users`, `sessions`, `games`, `orders` e `order_items`.
- **JSON:** `backend/data/jogos.json` contém as informações iniciais do catálogo. Na primeira inicialização, esses dados são inseridos no SQLite. As APIs trafegam JSON.

> Os exemplos disponibilizados em aula foram usados como referência de organização de páginas, roteamento, menu e formulários. Os exemplos ZIP continham sobretudo HTML/CSS e não possuíam todos os arquivos de um workspace Angular, então foi criada uma aplicação independente e completa em código-fonte.

## Pré-requisitos

1. **Node.js versão 22.13 ou superior** (recomendado Node.js 22 LTS), com npm.
2. Conexão à internet para instalar as dependências Angular (`npm install`) e para incorporar as fontes Google na compilação de produção. O Back-end não possui bibliotecas externas.
3. Duas janelas de terminal. Funciona em Windows, Linux, macOS ou WSL.

**Atalho no Windows:** depois de extrair o ZIP, você também pode abrir `iniciar-api.bat` e `iniciar-site.bat` em janelas separadas. O segundo script executa `npm install` automaticamente quando ainda não existe a pasta `node_modules`.

### 1. Inicie o Back-end (terminal 1)

Abra a pasta `PixelStore/backend`:

```bash
cd backend
npm start
```

Você deverá ver `Pixel Store API em http://localhost:3000/api/health`. Teste no navegador: <http://localhost:3000/api/health>.

O banco de dados `backend/data/pixelstore.sqlite` será gerado na primeira execução. **Não há necessidade de criar banco ou tabelas manualmente**. `node:sqlite` no Node 22 pode mostrar um aviso de funcionalidade experimental, mas a API continua executando.

### 2. Inicie o Front-end (terminal 2)

Em outra janela, abra `PixelStore/frontend`:

```bash
cd frontend
npm install
npm start
```

O Angular deverá abrir <http://localhost:4200>. Caso não abra, digite o endereço no navegador.

Se estiver no diretório raiz, lembre-se de entrar em `backend` ou `frontend` antes de executar os comandos. O `npm install` do Angular requer internet e pode criar `package-lock.json` e `node_modules/` localmente — a pasta `node_modules` não deve ser enviada para o GitHub nem incluída no ZIP.

### 3. Faça uma demonstração completa

1. Acesse a **Home** e escolha **PlayStation**, **Xbox**, **Nintendo** ou **PC**.
2. No **Catálogo**, busque por um nome, selecione filtro e altere ordenação.
3. Acesse um **jogo** e clique em **Adicionar ao carrinho**.
4. No **Carrinho**, revise os jogos e clique em **Continuar para checkout**.
5. O sistema levará à tela de **Login** se necessário. Clique em **Criar conta grátis** e cadastre uma conta de teste.
6. Volte ao carrinho e finalize o pedido com **Pix (simulação)** ou **Cartão (simulação)**.
7. A tela exibirá um número de pedido, gravado na tabela `orders` do SQLite.
8. Em **Perfil**, confira o histórico e saia da conta. Entre novamente para verificar que o pedido continua no banco.

### Dados e persistência

- Jogos: inicialmente importados do JSON para o banco, apenas na **primeira** execução com banco vazio.
- Usuários: gravados no SQLite, com senha protegida por `scrypt` + salt.
- Sessões: tokens aleatórios gerados pela API. O token fica no armazenamento do navegador, e apenas seu hash é gravado no SQLite.
- Carrinho: `localStorage` do navegador, para manter os itens após atualizar a página.
- Pedidos e itens: SQLite. Preços são recalculados no servidor; o cliente envia apenas IDs.

Para **reiniciar os dados**, pare a API e remova os arquivos `backend/data/pixelstore.sqlite`, `backend/data/pixelstore.sqlite-wal` e `backend/data/pixelstore.sqlite-shm` (se existirem). Inicie a API de novo. **Atenção: isso apaga os cadastros e pedidos.**

Para cadastrar, editar ou excluir jogos, use o painel administrativo descrito abaixo. O JSON continua sendo apenas a carga inicial, sem sincronização a cada execução.

### Endpoints REST

| Método | Endpoint | Resultado |
| --- | --- | --- |
| GET | `/api/health` | Status da API |
| GET | `/api/platforms` | Lista de plataformas |
| GET | `/api/games?platform=PC&q=Hades&sort=price_asc` | Jogos filtrados |
| GET | `/api/games/:id` | Detalhes do jogo |
| POST | `/api/auth/register` | Cadastro e autenticação |
| POST | `/api/auth/login` | Login e token |
| GET | `/api/auth/me` | Usuário autenticado |
| POST | `/api/auth/logout` | Encerramento da sessão |
| GET | `/api/orders` | Pedidos do usuário autenticado |
| POST | `/api/orders` | Criação de pedido simulado |

Exemplo de corpo para criação de pedido:

```json
{"gameIds":[1,10],"paymentMethod":"pix"}
```

As rotas de pedidos exigem `Authorization: Bearer <token>`. Leia `documentacao/API_E_BANCO.md` para descrição de classes e tabelas.

### Testes

O Back-end possui testes automatizados sem dependências externas:

```bash
cd backend
npm test
```

Eles verificam filtros, detalhes, cadastro, login, controle de acesso, pedidos persistidos na conexão SQLite e logout.

Para compilar o Angular após instalar suas dependências, execute:

```bash
cd frontend
npm run build
```

## Estrutura das pastas

```text
PixelStore/
├── frontend/                 # Angular 21 e as 8 páginas
│   ├── src/app/pages/        # componentes das telas
│   ├── src/app/shared/       # header, footer, game-card
│   ├── src/app/core/         # serviços, interfaces, rotas protegidas
│   └── src/assets/covers/    # artes SVG locais e ilustrativas
├── backend/
│   ├── src/                  # HTTP, repositórios e SQLite
│   ├── data/jogos.json       # catálogo inicial em JSON
│   └── test/api.test.js      # testes de API
├── documentacao/
│   ├── Ficha_Prototipagem_Pixel_Store.docx
│   ├── wireframes/           # 8 telas anexas, numeradas
│   └── API_E_BANCO.md
└── README.md
```

## Observações acadêmicas / limitações

A implementação segue a ficha de prototipagem, os arquivos de referência compartilhados e a ementa apresentada: programação visual, codificação funcional, conceitos de orientação a objetos e persistência de dados. **O enunciado completo de desenvolvimento não foi fornecido**, portanto requisitos adicionais específicos da avaliação (por exemplo, obrigação de `json-server`, um SGBD determinado ou componentes obrigatórios) deverão ser confirmados com o professor. O projeto é uma demonstração educacional para execução local, não uma aplicação comercial preparada para exposição pública.

**Créditos das imagens:** capas abstratas produzidas exclusivamente para fins ilustrativos; os nomes dos jogos citados pertencem aos respectivos titulares.


## Administração e CRUD de jogos

A área `/admin` utiliza a identidade visual da loja e possui painel com totais reais de jogos, usuários e pedidos, gerenciamento de jogos e histórico de todos os pedidos. A navegação inclui retorno à loja. As oito páginas originais continuam nas mesmas rotas.

### Executar no Ubuntu / WSL2

Use Node.js 22.13+ (compatível também com os requisitos do Angular instalado). Em dois terminais na raiz do projeto:

```bash
# Terminal 1
cd backend
npm start
```

```bash
# Terminal 2
cd frontend
npm ci
npm start -- --host 0.0.0.0 --open=false
```

Abra `http://localhost:4200` no navegador do Windows ou Ubuntu. A API fica em `http://localhost:3000`. O Front-end utiliza esse endereço no arquivo `frontend/src/app/core/services/api.config.ts`; o CORS permite a origem local na porta 4200.

### Conta automática para demonstração acadêmica

Ao iniciar a API normalmente com `npm start`, `NODE_ENV` ausente é tratado como `development`. Na primeira inicialização nesse ambiente (inclusive de um banco existente), o SQLite cria automaticamente:

- Nome: `admin`
- E-mail: `adm_conta@gmail.com`
- Senha: `12345`
- Papel: `admin`

Não é necessário executar `npm run create-admin`. Entre em `http://localhost:4200/login` com essas credenciais para acessar `/admin` e todas as operações do CRUD.

A criação é permitida somente em `NODE_ENV=development` ou `NODE_ENV=demo`. Para escolher explicitamente a demonstração no Ubuntu/WSL2:

```bash
cd backend
NODE_ENV=demo npm start
```

**Estas credenciais são públicas, fracas e exclusivas para demonstração. Nunca devem ser usadas em produção.** Em produção, configure obrigatoriamente `NODE_ENV=production` antes de iniciar a API; a conta demo não será criada. Ambientes `test`, `staging` e outros valores também não a criam. Mudar o ambiente não remove uma conta criada anteriormente: não reutilize o banco da demonstração em produção; se já o reutilizou, remova ou substitua as credenciais da conta antes de expor a aplicação.

A senha demo usa o mesmo hash scrypt com salt aleatório do projeto. Uma marca persistente `demo_admin_seeded` impede duplicação, redefinição de senha e recriação de uma conta apagada. Se o e-mail já existir, a conta original é preservada, sem promoção de papel nem alteração de senha; a API emite um aviso e mantém as credenciais originais. O cadastro público continua exigindo pelo menos 6 caracteres: a senha curta é uma exceção restrita à carga local de demonstração.

### Criar o primeiro administrador manualmente (alternativa sem conta demo)

O cadastro público sempre cria usuários `cliente`, mesmo que a requisição envie `role`. Não há endpoint para alterar papéis. O script local desativa a carga demo para essa execução e cria **uma conta nova**, recusa e-mail já cadastrado e recusa execução quando já existe um administrador. Ele usa a mesma validação e hash scrypt do cadastro, com senha administrativa de no mínimo 12 caracteres.

No Bash do Ubuntu/WSL2, a partir da raiz:

```bash
cd backend
read -r -p 'Nome do administrador: ' ADMIN_NAME
read -r -p 'E-mail do administrador: ' ADMIN_EMAIL
read -r -s -p 'Senha (mínimo 12 caracteres): ' ADMIN_PASSWORD
printf '\n'
export ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
npm run create-admin
unset ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

A senha digitada não aparece no terminal nem fica no histórico de comandos. O procedimento manual não usa a senha padrão de demonstração. Use o mesmo caminho `PIXELSTORE_DB` no script e na API caso tenha configurado um banco alternativo. Não publique credenciais nem arquivos SQLite.

Entre em `/login` com a conta criada: o destino padrão passa a ser `/admin`. O link **Administração** também aparece no menu. O guard Angular consulta `/api/auth/me` para verificar o papel atual no servidor. A API valida a sessão e o papel em cada operação administrativa; alterar o armazenamento do navegador não concede permissões.

### Endpoints adicionados

| Método | Endpoint | Acesso / resultado |
| --- | --- | --- |
| POST | `/api/games` | Admin: cadastra, retorna 201 e o jogo |
| PUT | `/api/games/:id` | Admin: substitui dados editáveis, retorna 200 |
| DELETE | `/api/games/:id` | Admin: exclusão física, retorna 204 sem corpo |
| GET | `/api/admin/stats` | Admin: `{games, users, orders}` |
| GET | `/api/admin/orders` | Admin: pedidos com `userId` e itens históricos |

As consultas públicas `GET /api/games` e `GET /api/games/:id` continuam funcionando. Pesquisa (`q`), plataforma (`platform`) e ordenação (`sort`) mantêm os filtros existentes. Login, cadastro e `/api/auth/me` agora retornam o campo `role` do usuário.

Envie `Authorization: Bearer <token>` nas operações administrativas. Requisições sem sessão válida retornam 401; clientes recebem 403; dados inválidos recebem 400; jogos inexistentes recebem 404. E-mail duplicado recebe 409, preservando o comportamento anterior.

Exemplo de corpo para POST e PUT de jogo:

```json
{
  "title": "Nova aventura",
  "description": "Descrição do jogo digital.",
  "platform": "PC",
  "genre": "Aventura",
  "priceCents": 5990,
  "cover": "assets/covers/zelda.svg",
  "available": true,
  "releaseYear": 2026,
  "featured": false
}
```

Preço é um inteiro em centavos entre 0 e 100000000; o formulário converte reais para centavos. Nome, descrição, gênero, plataforma, imagem e disponibilidade são obrigatórios. Ano e destaque têm valores padrão na criação pela API. O PUT recebe os mesmos campos obrigatórios. Plataformas aceitas: PlayStation, Xbox, Nintendo e PC. A imagem aceita URL HTTP(S), caminho servido pelo Angular ou nome de arquivo em `assets/covers`. Não há upload de arquivos: disponibilize o arquivo local em `frontend/src/assets` ou informe uma URL acessível.

### Migração e integridade do SQLite

A inicialização executa uma migração automática e transacional em `backend/src/database.js`, sem apagar usuários, sessões ou pedidos. Em um banco existente:

- Adiciona `users.role`, com padrão `cliente` e valores restritos a `cliente` e `admin`.
- Adiciona `games.available`, com padrão disponível.
- Migra `order_items.game_id` para aceitar NULL e usar `ON DELETE SET NULL`, copiando todos os itens existentes. Título, plataforma e preço de cada compra continuam armazenados no próprio item.
- Cria `app_meta` com a marca `catalog_seeded`. O JSON é importado uma única vez: excluir todos os jogos e reiniciar não recria o catálogo.
- Cria `game_ids` para reservar IDs crescentes e impedir que um carrinho antigo passe a apontar para outro jogo após uma exclusão.

O arquivo continua sendo `backend/data/pixelstore.sqlite` (ou o caminho de `PIXELSTORE_DB`), com chaves estrangeiras habilitadas e WAL. Ao visitar carrinho ou checkout, o Front-end consulta o catálogo, atualiza valores e remove jogos excluídos ou indisponíveis, exibindo aviso quando houver mudanças. A API também rejeita jogos indisponíveis/excluídos e recalcula o preço na confirmação. Alterações do catálogo não mudam valores de pedidos anteriores.

### Verificar o CRUD

1. Inicie a API em desenvolvimento/demonstração, entre com a conta demo e confira os totais do painel (ou use a alternativa manual em um banco sem admin).
2. Em **Jogos**, cadastre um título com os campos do formulário. Pesquise pelo nome e filtre pela plataforma.
3. Abra o catálogo e os detalhes para verificar os dados e a imagem.
4. Edite preço, descrição e disponibilidade. Verifique o catálogo e o carrinho novamente.
5. Com um cliente, faça um pedido de um jogo disponível. Depois, exclua esse jogo como admin, confirmando a operação. O catálogo deve removê-lo e os históricos em Perfil e Administração devem preservar os itens comprados.
6. Reinicie a API e atualize o navegador: alterações, exclusões, usuários e pedidos devem persistir.
7. Entre como cliente e tente `/admin`: o guard redireciona à loja. Uma tentativa direta de POST/PUT/DELETE com o token do cliente deve receber 403.
8. Confira as oito telas originais: login, cadastro, home, catálogo, detalhes, carrinho, checkout e perfil.

```bash
npm test --prefix backend
npm run build --prefix frontend
```

Os testes de API usam bancos isolados (memória e diretórios temporários), sem modificar o banco da loja. Cobrem autenticação de admin/cliente, tentativa de elevar papel pelo cadastro, autorização dos endpoints, validações, CRUD, filtros, pedidos, CORS, migração do esquema anterior, persistência após reabertura, catálogo vazio e IDs não reutilizados.
