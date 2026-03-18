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

## Executar

```bash
cd server
npm install
npm run dev
```

O frontend (Vite) faz proxy de `/api` para `http://localhost:3001`. Mantenha o servidor a correr enquanto usa a página **Senhas** no site.
