# Backend — Another World (API Senhas + dados do app)

Servidor Express que expõe a API de senhas e as APIs dos dados que antes ficavam só em localStorage (bookmarks, ideias, notas, checklists, fluxos, mesa de investigação, pomodoro). As senhas são **descriptografadas apenas aqui**; a chave AES-256 fica em variável de ambiente e **nunca** é enviada ao frontend.

## Checklist rápido (se a página der erro)

1. **Servidor a correr?** Numa terminal: `cd server`, `npm install`, `npm run dev`. Deve aparecer "Servidor rodando em http://localhost:3001".
2. **Ficheiro `.env`** dentro de `server/` com `DATABASE_URL` e `ENCRYPTION_KEY` (copie de `.env.example`).
3. **Tabela existe?** Se apagou a tabela, execute outra vez o `server/schema-senhas.sql` no seu PostgreSQL/Supabase.

## Configuração

1. Copie `.env.example` para `.env`.
2. Defina:
   - **ENCRYPTION_KEY**: chave para AES-256 (32 bytes). Exemplo: `openssl rand -hex 32`.
   - **DATABASE_URL**: URL do PostgreSQL (ex.: `postgresql://user:password@localhost:5432/dbname` ou connection string do Supabase).
   - **PORT** (opcional): porta do servidor (default 3001).
   - **CORS_ORIGIN** (opcional, produção): origens permitidas separadas por vírgula (ex.: `https://teusite.com`). Em desenvolvimento não é necessário.
   - **NODE_ENV**: em produção use `production`; em dev pode omitir ou usar `development`.

## Tabela no banco

Se a tabela `senhas` ainda não existir, crie-a com o script:

```bash
# Exemplo (PostgreSQL): ajuste o nome da base e utilizador
psql -U postgres -d sua_base -f schema-senhas.sql
```

Ou execute o conteúdo de **`server/schema-senhas.sql`** no SQL Editor do Supabase (ou no teu cliente PostgreSQL). A tabela terá:

- `id` (PK, serial)
- `categoria` (ex.: Redes Sociais, Faculdade, Trabalho)
- `servico` (ex.: Instagram)
- `usuario` (login)
- `senha` (armazenar **criptografada** com AES-256-GCM; o backend descriptografa ao listar)
- `grupo` (opcional): execute **`server/migrations/add-grupo.sql`** no seu banco para adicionar esta coluna e permitir agrupar senhas por projeto/sistema.

Para inserir senhas criptografadas, use o módulo `crypto.js` (função `encrypt`) num script ou futura rota POST protegida.

## Tabelas no Supabase (bookmarks, ideias, notas, imagens, etc.)

**Conexão:** em `server/.env` use `DATABASE_URL` do Supabase (Project Settings > Database > Connection string, Session pooler). Password = Database password (não a API key).

**SQL no Supabase:** Project > **SQL Editor** > New query. Cole o conteúdo do ficheiro e clique **Run**.

| Ficheiro | O que faz |
|----------|------------|
| **schema-another-world-completo.sql** | Cria tabelas `aw_bookmarks`, `aw_ideias`, `aw_notas`, `aw_custom_checklists`, `aw_fluxos`, `aw_mesa_estado`, `aw_pomodoro_settings` + dados iniciais + índices + segurança (RLS, REVOKE anon/authenticated). |
| **schema-aw-imagens.sql** | Cria só a tabela `aw_imagens` (Mesa + Fluxo) + índices + segurança. Rodar depois do completo. |
| **schema-mesa-sessoes.sql** | Cria a tabela `aw_mesa_sessoes` para guardar sessões exportadas da Mesa (por filtro: imagens + comentários + ordem). Opcional. |

Ordem: 1) `schema-another-world-completo.sql` → 2) `schema-aw-imagens.sql`. Depois, se quiser enviar filtros da Mesa ao banco: 3) `schema-mesa-sessoes.sql`. Ambos são idempotentes (pode rodar de novo sem erro). O frontend usa o backend para ler/escrever; se o servidor estiver em baixo, continua a usar localStorage.

## Executar (desenvolvimento)

```bash
cd server
npm install
npm run dev
```

O frontend (Vite) faz proxy de `/api` para `http://localhost:3001`. Mantenha o servidor a correr enquanto usa a página **Senhas** no site. O script `npm run dev` define automaticamente `NODE_ENV=development` (via cross-env) para evitar CORS a bloquear localhost.

## Produção (deploy com PM2)

O servidor serve **tudo**: a API em `/api/*` e o frontend (build do Vite) em `/`. Um único processo, um único domínio, sem CORS no dia a dia.

1. **Build do frontend** (na raiz do projeto):
   ```bash
   npm run build
   ```
   Isto gera a pasta `dist/`.

2. **Iniciar o servidor** (na raiz do projeto, para o caminho `dist` estar correto):
   ```bash
   pm2 start server/index.js --name another-world
   pm2 save
   pm2 startup   # configura reinício automático após reboot do sistema
   ```
   Depois de `pm2 startup`, execute o comando que o PM2 mostrar (ex.: `sudo env PATH=... pm2 startup systemd`). Assim o servidor volta sozinho após reiniciar a máquina.

3. **Variáveis de ambiente** em produção (em `server/.env` ou no PM2):
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://teudominio.com` (o domínio onde o site é acedido)
   - `PORT`, `DATABASE_URL`, `ENCRYPTION_KEY` como em desenvolvimento

---

## ⚠️ Onde pode parecer que não funcionou

Não é bug da arquitetura — é execução. Confirme estes pontos:

| Problema | Sintoma | Solução |
|----------|---------|---------|
| **1. Esqueceu o build** | Site não carrega; só a API responde | Na raiz: `npm run build`. É o erro mais provável em produção. |
| **2. CORS_ORIGIN não definido em produção** | Browser bloqueia pedidos; parece bug estranho | Em `server/.env`: `CORS_ORIGIN=https://teudominio.com` (o domínio real do site). |
| **3. Pasta `dist` não existe no servidor** | 404 no frontend; API funciona | O servidor mostra um aviso no arranque. Rode `npm run build` na raiz e reinicie. |
| **4. Dev sem NODE_ENV=development** | CORS a bloquear localhost | Use `npm run dev` no `server/` (já define NODE_ENV=development). Ou defina `CORS_ORIGIN=http://localhost:3000` no `.env` de dev. |

---

## Melhorias implementadas

### Melhorias sugeridas e implementadas por mim

- **Aviso ao arranque em produção:** Se `NODE_ENV=production` e a pasta `dist/` não existir, o servidor mostra um aviso no console para rodar `npm run build` antes de iniciar.
- **Resposta controlada quando `index.html` falha:** O fallback SPA usa um callback em `sendFile`: em caso de erro (ficheiro em falta ou outro), responde com 404/500 e a mensagem "Frontend não disponível. Execute 'npm run build' na raiz do projeto." em vez de deixar o Express enviar uma página de erro genérica.
- **Remoção de `express.json()` redundante:** A rota `POST /api/network-log` não usa mais `express.json()` no meio da rota; o body já é parseado pelo middleware global.
- **Documentação de CORS e NODE_ENV:** No README ficou explícito que em produção é obrigatório definir `CORS_ORIGIN` e que em dev o script `npm run dev` já define `NODE_ENV=development`.

### Melhorias sugeridas pelo ChatGPT e efetuadas por mim

- **1. Esqueceu o build:** Documentado na secção "Onde pode parecer que não funcionou" e no passo 1 de Produção; aviso no arranque em produção quando `dist/` não existe; mensagem clara no fallback quando `index.html` falha.
- **2. CORS_ORIGIN não definido em produção:** Incluído no checklist de variáveis de produção no README e na tabela de "Onde pode parecer que não funcionou" com a solução `CORS_ORIGIN=https://teudominio.com`.
- **3. `dist` não existe no servidor:** Aviso no arranque (produção) e resposta controlada no fallback (404/500 + mensagem) quando o ficheiro não pode ser enviado.
- **4. Dev sem NODE_ENV=development:** Script `npm run dev` no `server` passou a usar `cross-env NODE_ENV=development node index.js`, para que localhost não seja bloqueado por CORS em desenvolvimento, sem depender de variáveis no sistema.
