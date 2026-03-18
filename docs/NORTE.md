# Norte do Projeto — Another World

Guia de progressão e referência do projeto. Use este arquivo como bússola: consulte para lembrar o que já existe e peça ao Nexo para atualizá-lo sempre que quiser registrar marcos, decisões ou próximos passos.

---

## Base inicial (março 2026)

### Stack

- **React + TypeScript + Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **shadcn-ui / Radix** — `components.json`, `cn()` em `@/lib/utils`; UI: `button`, `card`, `input`, `checkbox`, `select`, `textarea`
- **react-router-dom** — rotas: `/`, `/mesa-de-investigacao`, `/notepad`, `/financeiro`
- **Supabase** — cliente em `@/lib/supabase.ts` (Auth + Postgres + Storage; variáveis no `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; ver `.env.example`)
- **@xyflow/react** — usado na Mesa de Investigação (fluxo com nodes/edges, Background, Controls, MiniMap)

### Estrutura principal

| O quê | Onde |
|-------|------|
| Rotas e layout | `src/App.tsx` |
| Layout com sidebar + área de conteúdo | `src/components/layout/Layout.tsx` |
| Sidebar (Home, Mesa de Investigação, Notepad) | `src/components/layout/Sidebar.tsx` |
| Página inicial | `src/pages/Home.tsx` |
| Mesa de Investigação (imagens, comentários, setas, localStorage) | `src/pages/MesaInvestigacao.tsx` + `src/pages/mesa-investigacao/` |
| Componente Textarea (shadcn-style) | `src/components/ui/textarea.tsx` |
| Notepad (dois checklists, progresso em localStorage) | `src/pages/Notepad.tsx` |
| Financeiro (entradas/saídas, categorias, dashboard mensal) | `src/pages/Financeiro.tsx` + `docs/FINANCEIRO.md` |
| Card, Input, Checkbox, Select (shadcn-style) | `src/components/ui/card.tsx`, `input.tsx`, `checkbox.tsx`, `select.tsx` |
| Cliente Supabase | `src/lib/supabase.ts` |
| Exemplo de variáveis de ambiente | `.env.example` |
| **Documentação / guias (.md)** | **`docs/`** |

### Rodar localmente

```bash
npm run dev
```

Abrir **http://localhost:3000/** no navegador (ou a porta que o Vite mostrar no terminal, se 3000 estiver em uso).

### Mesa de Investigação (incorporada)

- **Rota:** `/mesa-de-investigacao`
- **Persistência:** `localStorage` com chave `another-world-mesa-investigacao` (nodes, edges, viewport).
- **Tipos de nó:** `ImageNode` (imagem em base64, filename opcional, efeito scanline opcional) e `CommentNode` (texto, redimensionável).
- **Ações:** Adicionar Imagem (botão ou **Ctrl+V** na mesa), Comentário, Limpar Mesa. Setas entre nós (smoothstep, seta fechada).
- **Arquivos:** `MesaInvestigacao.tsx` (página), `mesa-investigacao/MesaInvestigacaoCanvas.tsx` (canvas + painel), `mesa-investigacao/nodes/ImageNode.tsx`, `CommentNode.tsx`, `mesa-investigacao/types.ts`.

### Notepad (incorporado)

- **Rota:** `/notepad`
- **Fluxo:** Ao entrar, aparece primeiro a **tela de seleção (overview)**: cards para cada checklist (built-in + customizados) com título e barra de progresso; card “Criar novo checklist” para criar um do zero. Ao clicar em um card, abre a **tela do checklist** (lista de tarefas, progresso, “+ Inserir” quando aplicável) com botão **“Voltar”** para retornar à seleção.
- **Checklists built-in:** “Base Infra & Backend” e “Checklist Teste Fluxo” (itens fixos no código). **Checklists customizados:** criados pelo usuário, nome “Novo checklist”, itens editáveis e persistidos.
- **Persistência:** `another-world-notepad-completed-map` (mapa de checklist id → IDs concluídos; migração a partir das chaves antigas infra/fluxo). `another-world-notepad-custom-checklists` (lista de checklists customizados: id, name, items). No checklist “infra”, tarefas adicionadas com “+ Inserir” continuam só em memória (somem ao recarregar); em checklists customizados, tarefas são salvas.
- **UI:** Card, Checkbox, Input, Button. Arquivo: `src/pages/Notepad.tsx`.

### Financeiro (incorporado)

- **Rota:** `/financeiro`
- **Objetivo:** Controle financeiro pessoal (entradas/saídas) por mês com categorias.
- **UI/UX:** Cards (Saldo/Entradas/Saídas), formulário de transação, gráfico de gastos por categoria (Recharts) e lista de movimentações.
- **Persistência:** Supabase Postgres (tabelas `categories` e `transactions` com RLS por usuário).
- **Guia de setup:** `docs/FINANCEIRO.md` (SQL + RLS).

### Próximos passos (sugestão)

- [ ] Configurar Supabase (criar projeto, preencher `.env`)
- [ ] Expandir home e páginas conforme a ideia do projeto
- [ ] Integrar APIs quando necessário

---

*Atualize este arquivo sempre que fizer sentido registrar progresso ou decisões.*
