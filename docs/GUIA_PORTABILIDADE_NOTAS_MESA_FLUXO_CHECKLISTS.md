# Guia de portabilidade — Notas, Mesa, Fluxos e Checklists

Documento para replicar a **ideia** e o **contrato de dados/API** noutro site. O Another World mantém o código original; aqui está o que comunica com o backend e onde vive no frontend.

---

## 1. Transporte e base URL

- **Dev:** Vite faz proxy `GET/POST… /api/*` → `http://localhost:3001` (`vite.config.ts`).
- **Cliente:** `src/lib/api.ts` — `fetch` em `BASE + url`, onde `BASE = import.meta.env.VITE_API_BASE` ou `""` (mesmo host).
- **Headers:** `Content-Type: application/json` em todos os pedidos mutáveis.
- **Erros:** corpo JSON com `error`; cliente lança `Error(data.error)`.
- **Auth:** neste projeto **não há** autenticação nas rotas abaixo; noutro site podes acrescentar tokens/cookies.

---

## 2. Notas

### API

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/notas` | — | `NotaItemApi[]` |
| GET | `/api/notas/:id` | — | `NotaItemApi` |
| POST | `/api/notas` | JSON parcial + `id` opcional | nota criada |
| PUT | `/api/notas/:id` | JSON parcial | nota atualizada |
| DELETE | `/api/notas/:id` | — | 204 |

**Tipo (API):**

```ts
type NotaItemApi = {
  id: string
  title: string
  content: string        // HTML do editor TipTap
  tags?: string[]
  pinned?: boolean
  pinnedOrder?: number
  updatedAt?: number     // epoch ms
}
```

### Banco (PostgreSQL)

- Tabela: **`aw_notas`**
- Campos relevantes: `id`, `title`, `content`, `tags` (JSON array), `pinned`, `pinned_order`, `updated_at`
- Lógica em: `server/db-another-world.js` (`listNotas`, `getNota`, `insertNota`, `updateNota`, `deleteNota`)
- Rotas Express: `server/index.js` (`/api/notas`…)

### Frontend (Another World)

| Área | Ficheiros |
|------|-----------|
| Lista / detalhe | `src/pages/notepad/NotepadNotasPage.tsx`, `NotepadNotaDetailPage.tsx` |
| Editor rich text | `NotaEditor.tsx` (TipTap), `NotaPreview.tsx`, extensões (`MaskedBlockExtension.ts`, …) |
| Dados locais / utils | `notepadData.ts`, `notasUtils.ts` |
| Chamadas API | `apiGetNotas`, `apiGetNota`, `apiPostNota`, `apiPutNota`, `apiDeleteNota` em `api.ts` |

**Dependências de UI (notas):** `@tiptap/*` (editor), possivelmente `lucide-react`.

---

## 3. Checklists (listas personalizadas)

### API

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/checklists` | — | `CustomChecklistApi[]` |
| POST | `/api/checklists` | `{ id?, name, items }` | checklist |
| PUT | `/api/checklists/:id` | parcial | checklist |
| DELETE | `/api/checklists/:id` | — | 204 |

**Tipo:**

```ts
type CustomChecklistApi = {
  id: string
  name: string
  items: { type: string; text: string; id?: string }[]  // type: "task" | "header" típico
}
```

### Conclusão de tarefas (mapa global)

Separado das listas: **quais item-ids estão “feitos” por checklist-id.**

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/notepad-completed` | — | `Record<checklistId, itemId[]>` |
| PUT | `/api/notepad-completed` | objeto acima | mesmo objeto |

- Tabela: **`aw_notepad_completed`** (uma linha `id=1`, coluna `payload` JSONB).

### Banco

- **`aw_custom_checklists`:** `id`, `name`, `items` (JSONB array)
- Ordem especial no list: ids `infra`, `fluxo` primeiro (built-in seed).

### Frontend

| Ficheiros |
|-----------|
| `NotepadChecklistsPage.tsx`, `NotepadChecklistDetailPage.tsx` |
| `Notepad.tsx` (`NotepadChecklistView`, guardar com `apiPutChecklist`) |
| `apiGetChecklists`, `apiPutChecklist`, … + `apiGetNotepadCompleted` / `apiPutNotepadCompleted` |

---

## 4. Fluxos (diagramas tipo flow)

### API

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/fluxos` | — | `FluxoItemApi[]` |
| POST | `/api/fluxos` | `{ id?, name, nodes, edges }` | fluxo |
| PUT | `/api/fluxos/:id` | parcial | fluxo |
| DELETE | `/api/fluxos/:id` | — | 204 |

**Tipo:**

```ts
type FluxoItemApi = {
  id: string
  name: string
  nodes: unknown[]   // formato React Flow / XYFlow (positions, data, type, id…)
  edges: { source: string; target: string }[]  // pode ter mais campos no cliente
}
```

### Banco

- **`aw_fluxos`:** `id`, `name`, `nodes`, `edges` (JSONB), `updated_at`

### Frontend

| Ficheiros |
|-----------|
| `NotepadFluxosPage.tsx`, `NotepadFluxoDetailPage.tsx` |
| `@xyflow/react` para canvas |
| `apiGetFluxos`, `apiPutFluxo`, … |

---

## 5. Mesa de investigação

### Estado da mesa (canvas único)

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/mesa` | — | `MesaEstadoApi` |
| PUT | `/api/mesa` | estado completo | estado guardado |

**Tipo:**

```ts
type MesaEstadoApi = {
  nodes: unknown[]   // nós React Flow: type "image" | "comment", position, data…
  edges: unknown[]
  viewport: { x: number; y: number; zoom: number }
  isLocked?: boolean
}
```

- Tabela: **`aw_mesa_estado`** — uma linha efectiva; `payload` JSONB com `nodes`, `edges`, `viewport`, `isLocked`.
- **Nós imagem** (`data`): `dataUrl` (base64), `fileName`, `categoryId`, `locked`, `scanline`…
- **Nós comentário** (`data`): `text`, `width`, `height`, `locked`…
- Categorias fixas: ver `MESA_CATEGORIES` em `src/pages/mesa-investigacao/types.ts`.

### Sessões exportadas (snapshot por categoria)

Para gravar no histórico um subconjunto da mesa (por grupo Dados/UI/Fluxo/Lógica):

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/api/mesa-sessoes` | — | lista de sessões |
| GET | `/api/mesa-sessoes/:id` | — | uma sessão |
| POST | `/api/mesa-sessoes` | `{ name?, categoryId, payload }` | sessão criada |
| DELETE | `/api/mesa-sessoes/:id` | — | 204 |

**Payload da sessão** (`MesaSessaoPayloadApi` em `api.ts`): `images`, `comments`, `imageOrder`, opcionalmente `commentEdges`, `edges`.

- Montagem do payload: `src/pages/mesa-investigacao/mesaSessaoExport.ts` (`buildMesaSessaoPayload`).
- Tabela: **`aw_mesa_sessoes`**

### Frontend (mesa)

| Ficheiros |
|-----------|
| `MesaInvestigacaoCanvas.tsx` — React Flow, persistência `apiGetMesa` / `apiPutMesa` |
| `types.ts`, `nodes/ImageNode.tsx`, `nodes/CommentNode.tsx` |
| `mesaSessaoExport.ts` + `apiPostMesaSessao` |

**Dependências:** `@xyflow/react`, `lucide-react`.

---

## 6. Resumo de tabelas PostgreSQL

| Tabela | Uso |
|--------|-----|
| `aw_notas` | Notas |
| `aw_custom_checklists` | Checklists |
| `aw_notepad_completed` | Mapa checklistId → ids de itens concluídos |
| `aw_fluxos` | Fluxos |
| `aw_mesa_estado` | Estado actual da mesa |
| `aw_mesa_sessoes` | Sessões exportadas da mesa |

Implementação SQL das rotas: **`server/db-another-world.js`**  
Registo das rotas HTTP: **`server/index.js`**

---

## 7. O que levar para “outro site”

1. **Contrato JSON** deste documento + tipos em `src/lib/api.ts`.
2. **Backend:** copiar/adaptar handlers em `index.js` + funções em `db-another-world.js` (ou reescrever noutra stack com as mesmas rotas).
3. **UI:** reimplementar com a mesma ideia; bibliotecas usuais:
   - Notas: editor rich (TipTap ou outro) que grave `content` HTML.
   - Fluxos + Mesa: grafo (XYFlow/React Flow ou equivalente).
4. **Imagens na mesa:** `dataUrl` no JSON pode ficar pesado; noutro projeto considera URLs + storage (S3, etc.) em vez de base64 na BD.

Se quiseres só **API minimal** noutro serviço, basta expor estes endpoints com os mesmos formatos; o front novo só precisa de `fetch` alinhado com isto.
