# Relatório — Another World (aplicação)

Documento de referência sobre **o que o site é**, **o que oferece** e **como está montado** (março 2026). Atualizar quando houver mudanças grandes.

---

## 1. Proposta e público

**Another World** é uma **área de trabalho pessoal** no browser: concentrar notas, investigação visual (imagens + comentários + ligações), listas de verificação, ideias, links, senhas (com criptografia no servidor), foco (Pomodoro), pausas (tela de descanso), estado da rede e (opcional) finanças com login Supabase.

Não é um produto multi-utilizador neste núcleo: os dados “Another World” via API Node + Postgres são **por instância/base de dados**; o **Financeiro** usa **Supabase Auth + RLS** por utilizador.

---

## 2. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TypeScript, Vite 7 |
| Estilo | Tailwind CSS v4, variáveis `--aw-*`, tema claro/escuro |
| UI | Radix/shadcn-style (`button`, `card`, `input`, `checkbox`, …) |
| Rotas | `react-router-dom` v7 |
| Rich text (notas) | TipTap |
| Grafos | `@xyflow/react` (Mesa; existe código de fluxos guardados na API mas a rota principal de “Fluxos” na UI lê a **Mesa**) |
| Animações | `motion` (tela de descanso) |
| Drag (outros) | `@dnd-kit` |
| Gráficos | Recharts (Financeiro) |
| Backend app | Express (Node), porta típica **3001** |
| BD principal | PostgreSQL (`DATABASE_URL`, ex. Supabase) |
| Auth (só Financeiro) | Supabase (`VITE_SUPABASE_*`) |
| Dev | Vite proxy `/api` → `localhost:3001` |

Variáveis relevantes: `server/.env` (`DATABASE_URL`, `ENCRYPTION_KEY` para senhas), `VITE_API_BASE` opcional em produção.

---

## 3. Mapa de rotas (frontend)

| Rota | Página | Proteção |
|------|--------|----------|
| `/login` | Login Supabase | — |
| `/` | Home (boas-vindas simples) | — |
| `/mesa-de-investigacao` | Mesa de investigação | — |
| `/notas` | Lista de notas | — |
| `/notas/:notaId` | Edição/visualização de nota | — |
| `/checklists` | Lista de checklists | — |
| `/checklists/:checklistId` | Detalhe de um checklist | — |
| `/fluxos` | **Fluxo de investigação** (derivado da Mesa) | — |
| `/senhas` | Gestor de senhas | — |
| `/bookmarks` | Bookmarks | — |
| `/ideias` | Ideias rápidas | — |
| `/pomodoro` | Pomodoro | — |
| `/descanso` | Configuração da tela de descanso | — |
| `/rede` | Diagnóstico de rede/latência | — |
| `/financeiro` | Financeiro | **Supabase sessão** (`ProtectedRoute`) |

**Nota:** Existe `NotepadFluxoDetailPage.tsx` (diagramas XYFlow ligados à API `/api/fluxos`), mas **não há rota registada** no `App.tsx` — a entrada “Fluxos” no menu abre só o fluxo **baseado na Mesa**.

---

## 4. Funcionalidades por área

### 4.1 Home (`/`)
Texto de boas-vindas; ponto de entrada. Navegação pela sidebar.

### 4.2 Mesa de investigação
- Canvas **React Flow**: nós **imagem** (data URL, nome, categoria Dados/UI/Fluxo/Lógica, scanline, bloqueio de arrasto) e **comentário** (texto, redimensionar, bloqueio).
- **Ligações** entre nós (setas); **Ctrl+V** com imagem no clipboard (com foco/rato na mesa).
- **Undo**, filtro por categoria, exportar grupo para **sessão** no banco (`/api/mesa-sessoes`).
- **Persistência:** `GET/PUT /api/mesa` (estado único: nós, arestas, viewport, cadeado pan/zoom).

### 4.3 Notas
- Lista com pins, tags, datas.
- Editor TipTap (formatação, listas, código, alinhamento, bloco mascarado para texto longo — compacto no editor, expandido no preview).
- **API:** CRUD `/api/notas` (conteúdo HTML).

### 4.4 Checklists
- Listas com itens tipo tarefa/cabeçalho; listas “fixas” **infra** e **fluxo** vêm da BD (seed); outras são custom.
- Progresso por checklist: **`/api/notepad-completed`** (mapa checklistId → ids concluídos).
- **API:** CRUD `/api/checklists`.

### 4.5 Fluxos (menu)
- **UI actual:** “Fluxo de investigação” — ordem das imagens da Mesa segundo as setas; painel “Próximo passo”, comentários ligados à secção seleccionada, filtro por categoria.
- **API `/api/fluxos`:** guarda diagramas `{ name, nodes, edges }` em JSONB; hoje **sem página pública** ligada no router (código legado / futuro em `NotepadFluxoDetailPage`).

### 4.6 Senhas
- CRUD com categorias, serviço, utilizador, **senha encriptada no servidor** (nunca chave no cliente). Tabela `senhas` + `ENCRYPTION_KEY`.
- UI: grupos, ícones por tipo de serviço, copiar, revelar.

### 4.7 Bookmarks
- URLs, título, tags, nota, origem. CRUD `/api/bookmarks`.

### 4.8 Ideias
- Lista curta de notas de ideia (texto + data). CRUD `/api/ideias`.

### 4.9 Pomodoro
- Ciclos trabalho / pausa curta / pausa longa; configurações persistidas em **`/api/pomodoro-settings`**.
- Timer, ciclos, dica sobre a técnica.

### 4.10 Tela de descanso (`/descanso`)
- Configuração em **sessionStorage**: minutos de inatividade, atalho (ex. Alt+P), título, texto de saída, imagem de fundo (validação tamanho/peso), **morceguinho pixel** (Motion + CSS) ou ícone café.
- Fullscreen ao atalho ou após idle; dismiss com tecla ou clique.

### 4.11 Rede
- Indicador na sidebar (verde/âmbar/vermelho) conforme `/api/ping` e histórico.
- Página com latência, ping externo (via servidor), opcional log `/api/network-log`.

### 4.12 Financeiro
- Apenas com **login Supabase**. Entradas/saídas, categorias, gráficos (Recharts), dados nas tabelas Supabase com RLS.

### 4.13 Login (`/login`)
- Entrada para sessão Supabase (usada sobretudo pelo Financeiro).

---

## 5. Backend — visão das APIs

Todas sob prefixo `/api` (exceto raiz do servidor). Resumo:

| Área | Endpoints principais |
|------|----------------------|
| Saúde | `GET /health`, `GET /ping`, `GET /ping-external`, `POST /network-log` |
| Senhas | `GET/POST /senhas`, `PUT/DELETE /senhas/:id` |
| Bookmarks | CRUD `/bookmarks` |
| Ideias | CRUD `/ideias` |
| Notas | CRUD `/notas` |
| Checklists | CRUD `/checklists` |
| Progresso checklists | `GET/PUT /notepad-completed` |
| Fluxos (dados) | CRUD `/fluxos` |
| Mesa | `GET/PUT /mesa` |
| Sessões mesa | CRUD `/mesa-sessoes` |
| Pomodoro | `GET/PUT /pomodoro-settings` |

Senhas exigem `ENCRYPTION_KEY`; a maior parte do resto exige `DATABASE_URL` (`requireDb`).

Implementação SQL centralizada em **`server/db-another-world.js`** (tabelas `aw_*`) + **`server/db.js`** (senhas e possivelmente legado).

---

## 6. Dados e migração

- **Migração one-shot:** `runMigrationOnce` (`migrateLocalStorageToApi`) ao arranque da app — migra dados antigos do browser para a API quando aplicável.
- **Tela de descanso / tema:** principalmente cliente (`sessionStorage` / contexto).

---

## 7. Documentação relacionada no repositório

| Ficheiro | Conteúdo |
|----------|----------|
| `docs/GUIA_PORTABILIDADE_NOTAS_MESA_FLUXO_CHECKLISTS.md` | Contrato JSON e tabelas para replicar notas/mesa/fluxos/checklists noutro projeto |
| `docs/NORTE.md` | Bússola histórica do projeto (pode estar parcialmente desactualizada face a API/BD) |
| `docs/REFERENCIA_IDEAS.md` | Referência de ideias |
| `server/README.md` | Notas sobre o servidor |

---

## 8. Limitações / notas honestas

- **Imagens na Mesa** em base64 no JSON podem pesar na BD e no tráfego.
- **Fluxos** na API existem, mas a navegação “Fluxos” do menu não os lista — foco na Mesa.
- **Home** ainda é mínima; o valor está nas ferramentas da sidebar.
- **Auth global** não protege notas/mesa/etc.; quem tem URL + API + BD acede aos dados dessa instância.

---

*Última actualização deste relatório: documento criado para refletir o estado do código em março 2026.*
