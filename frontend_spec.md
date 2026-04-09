# Frontend Specification — Nest Clean Forum

> Documento de análise completa do backend e especificação para implementação do frontend.
> Gerado em: 08/04/2026

---

## 1. Visão Geral do Projeto

**Tipo:** Fórum de Perguntas e Respostas (Q&A)
**Backend:** NestJS com Clean Architecture / DDD
**Banco de Dados:** PostgreSQL via Prisma 7
**Autenticação:** JWT RS256
**Storage:** Cloudflare R2 (S3-compatible)
**Porta padrão:** 3333

---

## 2. Modelo de Dados (Entidades do Backend)

### 2.1 User / Student

| Campo    | Tipo   | Observação                          |
| -------- | ------ | ----------------------------------- |
| id       | UUID   | PK                                  |
| name     | string | min 3 chars                         |
| email    | string | único, formato email                |
| password | string | min 6 chars (hash bcrypt)           |
| role     | enum   | `STUDENT` (default) ou `INSTRUCTOR` |

### 2.2 Question

| Campo        | Tipo      | Observação                       |
| ------------ | --------- | -------------------------------- |
| id           | UUID      | PK                               |
| title        | string    | obrigatório                      |
| slug         | string    | único, gerado a partir do título |
| content      | string    | corpo da pergunta                |
| createdAt    | DateTime  | auto                             |
| updatedAt    | DateTime? | atualizado ao editar             |
| authorId     | UUID      | FK → User                        |
| bestAnswerId | UUID?     | FK → Answer (unique)             |

**Propriedades computadas no domínio:**

- `isNew`: boolean — pergunta criada nos últimos 3 dias
- `excerpt`: string — primeiros 120 caracteres do content

### 2.3 Answer

| Campo      | Tipo      | Observação           |
| ---------- | --------- | -------------------- |
| id         | UUID      | PK                   |
| content    | string    | corpo da resposta    |
| createdAt  | DateTime  | auto                 |
| updatedAt  | DateTime? | atualizado ao editar |
| authorId   | UUID      | FK → User            |
| questionId | UUID      | FK → Question        |

### 2.4 Comment

| Campo      | Tipo      | Observação                         |
| ---------- | --------- | ---------------------------------- |
| id         | UUID      | PK                                 |
| content    | string    | corpo do comentário                |
| createdAt  | DateTime  | auto                               |
| updatedAt  | DateTime? | atualizado ao editar               |
| authorId   | UUID      | FK → User                          |
| questionId | UUID?     | FK → Question (se for de question) |
| answerId   | UUID?     | FK → Answer (se for de answer)     |

### 2.5 Attachment

| Campo      | Tipo   | Observação      |
| ---------- | ------ | --------------- |
| id         | UUID   | PK              |
| title      | string | nome do arquivo |
| url        | string | URL no R2/S3    |
| questionId | UUID?  | FK → Question   |
| answerId   | UUID?  | FK → Answer     |

**Tipos aceitos:** `.png`, `.jpg`, `.jpeg`, `.pdf` — max 2MB

---

## 3. API — Mapeamento Completo dos Endpoints

### 3.1 Autenticação (Públicos)

| Método | Rota        | Body                        | Resposta                   |
| ------ | ----------- | --------------------------- | -------------------------- |
| POST   | `/accounts` | `{ name, email, password }` | `201` (sem body)           |
| POST   | `/sessions` | `{ email, password }`       | `{ access_token: string }` |

### 3.2 Questions (Autenticado)

| Método | Rota                                  | Body / Query         | Resposta                       |
| ------ | ------------------------------------- | -------------------- | ------------------------------ |
| POST   | `/questions`                          | `{ title, content }` | `201` (sem body)               |
| GET    | `/questions`                          | `?page=1`            | `{ questions: QuestionDTO[] }` |
| GET    | `/questions/:slug`                    | —                    | `{ question: QuestionDTO }`    |
| PUT    | `/questions/:id`                      | `{ title, content }` | `204`                          |
| DELETE | `/questions/:id`                      | —                    | `204`                          |
| PATCH  | `/questions/:answerId/choose-as-best` | —                    | `204`                          |

### 3.3 Answers (Autenticado)

| Método | Rota                             | Body / Query  | Resposta                   |
| ------ | -------------------------------- | ------------- | -------------------------- |
| POST   | `/questions/:questionId/answers` | `{ content }` | `201` (sem body)           |
| GET    | `/questions/:questionId/answers` | `?page=1`     | `{ answers: AnswerDTO[] }` |
| PUT    | `/answers/:id`                   | `{ content }` | `204`                      |
| DELETE | `/answers/:id`                   | —             | `204`                      |

### 3.4 Comments (Autenticado)

| Método | Rota                              | Body / Query  | Resposta                     |
| ------ | --------------------------------- | ------------- | ---------------------------- |
| POST   | `/questions/:questionId/comments` | `{ content }` | `201` (sem body)             |
| POST   | `/answers/:answerId/comments`     | `{ content }` | `201` (sem body)             |
| DELETE | `/questions/comments/:id`         | —             | `204`                        |
| DELETE | `/answers/comments/:id`           | —             | `204`                        |
| GET    | `/questions/:questionId/comments` | `?page=1`     | `{ comments: CommentDTO[] }` |
| GET    | `/answers/:answerId/comments`     | `?page=1`     | `{ comments: CommentDTO[] }` |

### 3.5 Attachments (Autenticado)

| Método | Rota           | Body                         | Resposta                   |
| ------ | -------------- | ---------------------------- | -------------------------- |
| POST   | `/attachments` | `multipart/form-data` (file) | `{ attachmentId: string }` |

### 3.6 DTOs de Resposta (Presenters)

**QuestionDTO:**

```json
{
  "id": "uuid",
  "title": "string",
  "slug": "string",
  "bestAnswerId": "uuid | undefined",
  "createdAt": "ISO DateTime",
  "updatedAt": "ISO DateTime | null"
}
```

**AnswerDTO:**

```json
{
  "id": "uuid",
  "content": "string",
  "createdAt": "ISO DateTime",
  "updatedAt": "ISO DateTime | null"
}
```

**CommentDTO:**

```json
{
  "id": "uuid",
  "content": "string",
  "createdAt": "ISO DateTime",
  "updatedAt": "ISO DateTime | null"
}
```

> **Observação importante:** Os presenters atuais NÃO retornam `authorId`, `authorName`, nem `content` da question na listagem. O frontend precisará considerar isso — pode ser necessário ajustar os presenters no backend ou fazer requests adicionais.

---

## 4. Autenticação — Fluxo Completo

```
1. Usuário se registra → POST /accounts { name, email, password }
2. Usuário faz login  → POST /sessions { email, password }
3. Backend retorna    → { access_token: "jwt-token" }
4. Token payload      → { sub: "user-uuid" }
5. Frontend armazena  → token em memória ou httpOnly cookie
6. Requests protegidos → Header: Authorization: Bearer <token>
7. Rotas públicas     → /accounts, /sessions, GET /questions/:slug
```

**Algoritmo:** RS256 (assimétrico — chave pública pode ser distribuída)

---

## 5. Observações de Infraestrutura para o Frontend

### 5.1 CORS

⚠️ **Não configurado no backend.** Será necessário adicionar `app.enableCors()` em `main.ts` antes de iniciar o frontend em desenvolvimento.

### 5.2 Rate Limiting

❌ Não existe. O frontend deve implementar debounce/throttle em ações repetidas.

### 5.3 Paginação

- Todas as listas usam `?page=N` (1-indexed)
- Backend retorna **20 itens por página** (padrão nos repositórios)
- Não há `totalCount` ou `hasNextPage` na resposta — o frontend deve inferir pelo tamanho do array retornado

### 5.4 Erros do Backend

Os controllers mapeiam erros do domínio para HTTP:

- `ResourceNotFoundError` → 400 Bad Request (nota: deveria ser 404)
- `NotAllowedError` → 401 Unauthorized
- `StudentAlreadyExistsError` → 409 Conflict
- `WrongCredentialsError` → 401 Unauthorized
- `InvalidAttachmentTypeError` → 400 Bad Request
- Validação Zod → 400 Bad Request com detalhes

### 5.5 Upload de Arquivos

- Endpoint: `POST /attachments`
- Formato: `multipart/form-data` com campo `file`
- Retorna `{ attachmentId }` — o ID deve ser enviado junto na criação/edição de question/answer
- Tipos: PNG, JPG, JPEG, PDF
- Tamanho máximo: 2MB

---

## 6. Especificação do Frontend

### 6.1 Stack Recomendada

| Tecnologia          | Justificativa                                              |
| ------------------- | ---------------------------------------------------------- |
| **React 19**        | Ecossistema maduro, Server Components, concurrent features |
| **Next.js 15**      | SSR/SSG para SEO, App Router, layouts aninhados            |
| **TypeScript 5**    | Type safety ponta a ponta com o backend                    |
| **Tailwind CSS 4**  | Utility-first, design system rápido e consistente          |
| **shadcn/ui**       | Componentes acessíveis (Radix) + Tailwind, sem lock-in     |
| **TanStack Query**  | Cache, revalidação, estados de loading/error/stale         |
| **React Hook Form** | Performance em forms + integração com Zod                  |
| **Zod**             | Validação client-side espelhando o backend                 |
| **Zustand**         | Estado global leve (auth, tema)                            |
| **Lucide Icons**    | Ícones consistentes, tree-shakeable                        |
| **date-fns**        | Formatação de datas leve                                   |

### 6.2 Arquitetura do Frontend

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Layout público (login/registro)
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (forum)/            # Layout autenticado
│   │   │   ├── layout.tsx      # Sidebar + Header + Auth guard
│   │   │   ├── page.tsx        # Feed de perguntas recentes
│   │   │   ├── questions/
│   │   │   │   ├── new/        # Criar pergunta
│   │   │   │   └── [slug]/     # Detalhe da pergunta
│   │   │   └── profile/        # Perfil do usuário
│   │   ├── layout.tsx          # Root layout (providers, fonts)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── question/           # QuestionCard, QuestionForm, QuestionDetail
│   │   ├── answer/             # AnswerCard, AnswerForm, BestAnswerBadge
│   │   ├── comment/            # CommentList, CommentForm
│   │   ├── attachment/         # FileUpload, AttachmentPreview
│   │   ├── auth/               # LoginForm, RegisterForm
│   │   └── layout/             # Header, Sidebar, Footer, UserMenu
│   ├── hooks/
│   │   ├── use-auth.ts         # Auth context + token management
│   │   ├── use-questions.ts    # TanStack Query hooks para questions
│   │   ├── use-answers.ts
│   │   ├── use-comments.ts
│   │   └── use-upload.ts       # Hook de upload com preview
│   ├── lib/
│   │   ├── api.ts              # Axios/fetch client com interceptors
│   │   ├── auth.ts             # Token storage, refresh logic
│   │   └── utils.ts            # Helpers (formatDate, truncate, etc.)
│   ├── types/
│   │   └── api.ts              # Types espelhando os DTOs do backend
│   └── stores/
│       └── auth-store.ts       # Zustand store para auth state
```

### 6.3 Páginas & Rotas

| Rota                     | Página              | Auth | Descrição                              |
| ------------------------ | ------------------- | ---- | -------------------------------------- |
| `/sign-in`               | Login               | ❌   | Formulário de autenticação             |
| `/sign-up`               | Registro            | ❌   | Formulário de criação de conta         |
| `/`                      | Feed                | ✅   | Lista de perguntas recentes (paginada) |
| `/questions/new`         | Nova Pergunta       | ✅   | Form de criação com upload de anexos   |
| `/questions/[slug]`      | Detalhe da Pergunta | ✅   | Pergunta + respostas + comentários     |
| `/questions/[slug]/edit` | Editar Pergunta     | ✅   | Form de edição (apenas autor)          |
| `/profile`               | Perfil              | ✅   | Minhas perguntas e respostas           |

### 6.4 Componentes Principais

#### Layout

- **Header:** Logo, barra de busca (client-side filter), botão "Nova Pergunta", avatar/menu do usuário
- **Sidebar (desktop):** Navegação — Feed, Minhas Perguntas, Tags (futuro)
- **Mobile:** Bottom navigation ou hamburger menu

#### Question Card (Feed)

```
┌─────────────────────────────────────────────┐
│  ● Nova                         há 2 horas  │
│                                              │
│  Como configurar JWT no NestJS?              │
│  Preciso implementar autenticação RS256...   │
│                                              │
│  💬 3 respostas   💭 5 comentários   ✅ Resolvida │
└─────────────────────────────────────────────┘
```

- Badge "Nova" para perguntas < 3 dias
- Badge "Resolvida" se `bestAnswerId` existe
- Excerpt do content (120 chars)
- Contadores (precisam de dados extras ou requests)
- Timestamp relativo (date-fns `formatDistanceToNow`)

#### Question Detail Page

```
┌─────────────────────────────────────────────────┐
│  Como configurar JWT no NestJS?                  │
│  por Luiz Silva · há 2 horas · Editado          │
│                                                   │
│  [Content completo da pergunta em Markdown]       │
│                                                   │
│  📎 diagrama.png  📎 referência.pdf              │
│                                                   │
│  [Editar] [Excluir]  ← apenas para o autor      │
│                                                   │
│  ─── Comentários da Pergunta ───                 │
│  │ João: Boa pergunta! · há 1h  [🗑️]           │
│  │ [Adicionar comentário...]                     │
│                                                   │
│  ═══ 3 Respostas ═══                             │
│                                                   │
│  ┌─ ✅ Melhor Resposta ─────────────────────┐    │
│  │  Você precisa gerar um par RSA...         │    │
│  │  por Maria · há 1 hora                    │    │
│  │  [Comentários] [Editar] [Excluir]         │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ┌─ Resposta ───────────────────────────────┐    │
│  │  Outra abordagem seria usar Passport...   │    │
│  │  por Carlos · há 30 min                   │    │
│  │  [Escolher como melhor] ← só p/ autor Q  │    │
│  │  [Comentários] [Editar] [Excluir]         │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ─── Nova Resposta ───                           │
│  [Textarea com toolbar]                           │
│  [📎 Anexar] [Enviar Resposta]                   │
└─────────────────────────────────────────────────┘
```

#### Forms

- **Nova Pergunta:** título + editor de conteúdo rico + upload de anexos + preview
- **Nova Resposta:** editor de conteúdo + upload + submit inline
- **Comentário:** input simples com submit (sem rich text)
- Todos com validação Zod client-side espelhando o backend

### 6.5 Design System & UX

#### Tema Visual

- **Estilo:** Moderno, limpo, inspirado em Stack Overflow + GitHub Discussions
- **Cores:**
  - Primary: Indigo/Violet (`#6366f1` → `#8b5cf6`)
  - Success/Resolvida: Emerald (`#10b981`)
  - Background: Slate claro (`#f8fafc`) / Dark: Slate escuro (`#0f172a`)
  - Cards: Branco com sombra sutil / Dark: `#1e293b`
- **Tipografia:**
  - Font principal: Inter (UI) — clean, legível
  - Font mono: JetBrains Mono (code blocks)
- **Dark/Light mode:** Toggle no header, persistido em localStorage
- **Border radius:** `0.75rem` (rounded-xl) para cards, `0.5rem` para inputs
- **Spacing:** Base 4px grid system (Tailwind default)

#### Princípios de UX

1. **Feedback imediato:** Optimistic updates em ações (postar, deletar, votar)
2. **Loading states:** Skeletons em cards e listas (não spinners genéricos)
3. **Empty states:** Ilustrações + CTA quando não há conteúdos
4. **Error boundaries:** Mensagens amigáveis com retry, nunca stack traces
5. **Acessibilidade:** ARIA labels, keyboard navigation, foco visível, contraste AA+
6. **Responsividade:** Mobile-first, breakpoints: `sm(640) md(768) lg(1024) xl(1280)`
7. **Transições:** Animações suaves (Framer Motion ou CSS) em mount/unmount de cards
8. **Infinite scroll ou pagination:** Botão "Carregar mais" no feed (mais previsível que infinite scroll)

#### Microinterações

- Hover suave em cards (elevação de sombra)
- Animação de confetti/check ao marcar melhor resposta
- Toast notifications para ações (sucesso/erro)
- Fade-in de novos itens ao adicionar comentário/resposta
- Pulse no botão de submit durante loading

### 6.6 Fluxos de Usuário

#### Fluxo 1: Primeiro Acesso

```
Landing/Sign-up → Preenche form → 201 Created → Redirect /sign-in
→ Preenche login → Token recebido → Redirect / (Feed)
```

#### Fluxo 2: Criar Pergunta

```
Feed → Clica "Nova Pergunta" → /questions/new
→ Preenche título e conteúdo → (opcional) Upload anexo → POST /attachments → recebe attachmentId
→ Submit → POST /questions { title, content, attachmentsIds } → Redirect /questions/[slug]
```

#### Fluxo 3: Responder Pergunta

```
Feed → Clica em Question Card → /questions/[slug]
→ Lê pergunta + respostas → Scrolla até form de resposta
→ Escreve conteúdo → Submit → POST /questions/:id/answers → Resposta aparece na lista (optimistic)
```

#### Fluxo 4: Escolher Melhor Resposta (apenas autor da pergunta)

```
Question Detail → Vê respostas → Clica "Escolher como melhor" na resposta desejada
→ PATCH /questions/:answerId/choose-as-best → Badge ✅ aparece → Reordenação visual
```

#### Fluxo 5: Comentar

```
Question Detail → Clica "Comentar" em pergunta ou resposta
→ Input expande → Digita → Submit → POST /questions/:id/comments
→ Comentário aparece inline (optimistic)
```

#### Fluxo 6: Editar/Excluir (apenas autor)

```
Question Detail → Vê botões [Editar][Excluir] nos próprios conteúdos
→ Editar: abre form preenchido → PUT /questions/:id → Feedback de sucesso
→ Excluir: dialog de confirmação → DELETE → Redirect ao feed
```

---

## 7. API Client — Tipagem TypeScript

```typescript
// types/api.ts

export interface QuestionDTO {
  id: string
  title: string
  slug: string
  bestAnswerId?: string
  createdAt: string
  updatedAt: string | null
}

export interface AnswerDTO {
  id: string
  content: string
  createdAt: string
  updatedAt: string | null
}

export interface CommentDTO {
  id: string
  content: string
  createdAt: string
  updatedAt: string | null
}

export interface AuthResponse {
  access_token: string
}

export interface UploadResponse {
  attachmentId: string
}

// Request types
export interface CreateAccountRequest {
  name: string
  email: string
  password: string
}

export interface AuthenticateRequest {
  email: string
  password: string
}

export interface CreateQuestionRequest {
  title: string
  content: string
  attachments?: string[] // attachment IDs
}

export interface EditQuestionRequest {
  title: string
  content: string
  attachments?: string[]
}

export interface CreateAnswerRequest {
  content: string
  attachments?: string[]
}

export interface EditAnswerRequest {
  content: string
  attachments?: string[]
}

export interface CreateCommentRequest {
  content: string
}

export interface PaginatedQuery {
  page?: number
}
```

---

## 8. Lacunas Identificadas no Backend (para o frontend funcionar plenamente)

### 8.1 Críticas (necessárias para UX mínima)

| #   | Lacuna                                      | Impacto                                                                             | Solução Sugerida                                                                                |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **CORS não configurado**                    | Frontend em porta diferente será bloqueado                                          | Adicionar `app.enableCors({ origin: [frontendUrl] })` em `main.ts`                              |
| 2   | **Presenters não retornam `authorName`**    | Impossível mostrar quem postou                                                      | Adicionar `authorName` (ou `author: { id, name }`) nos presenters de Question, Answer e Comment |
| 3   | **QuestionPresenter não retorna `content`** | Precisa de request extra por question ou ajuste no presenter de listagem vs detalhe | Separar `QuestionListPresenter` (sem content) e `QuestionDetailPresenter` (com content)         |
| 4   | **Sem contagem de respostas/comentários**   | Feed não pode exibir "3 respostas"                                                  | Adicionar `answersCount`, `commentsCount` no presenter ou nos repositórios                      |

### 8.2 Importantes (melhoram significativamente a UX)

| #   | Lacuna                                                       | Impacto                                                     | Solução Sugerida                                          |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------- |
| 5   | **Sem `totalCount` na paginação**                            | Impossível mostrar "Página 1 de 5" ou total de resultados   | Retornar `{ items, totalCount, page, pageSize }`          |
| 6   | **Sem endpoint de perfil do usuário**                        | Não é possível exibir "Minhas perguntas"                    | Criar `GET /me` retornando dados do user autenticado      |
| 7   | **Sem busca/pesquisa**                                       | Usuários não podem encontrar perguntas específicas          | Criar `GET /questions/search?q=term` com full-text search |
| 8   | **GET /questions/:slug** parece requerer auth (guard global) | A pergunta deveria ser pública para SEO                     | Adicionar `@Public()` ao controller                       |
| 9   | **Sem endpoint GET /notifications**                          | Backend tem domínio de notificações mas sem controller HTTP | Criar controller para listar e ler notificações           |

### 8.3 Nice-to-Have (futuro)

| #   | Lacuna                                 | Solução Sugerida                                  |
| --- | -------------------------------------- | ------------------------------------------------- |
| 10  | Sem WebSocket/SSE para real-time       | Adicionar gateway para notificações em tempo real |
| 11  | Sem sistema de votos (upvote/downvote) | Novo domínio de votação                           |
| 12  | Sem tags/categorias nas perguntas      | Entidade Tag + relação many-to-many               |
| 13  | Sem avatar do usuário                  | Campo `avatarUrl` no User                         |
| 14  | Sem Markdown rendering no backend      | Frontend renderiza Markdown (react-markdown)      |

---

## 9. Plano de Implementação — Fases

### Fase 1: Fundação (Setup + Auth + Feed)

- [ ] Inicializar projeto Next.js 15 + Tailwind 4 + shadcn/ui
- [ ] Configurar API client (fetch/axios com interceptors)
- [ ] Implementar auth store (Zustand) + token management
- [ ] Páginas: `/sign-in`, `/sign-up`
- [ ] Layout autenticado: Header + Sidebar
- [ ] Página Feed `/` com lista de perguntas paginada
- [ ] Dark/Light mode toggle

### Fase 2: Core do Fórum (Questions + Answers)

- [ ] Página `/questions/new` — criar pergunta com upload
- [ ] Página `/questions/[slug]` — detalhe completo
- [ ] List de respostas com paginação
- [ ] Form de nova resposta inline
- [ ] Editar/Excluir pergunta e resposta
- [ ] Escolher melhor resposta (UI + PATCH)

### Fase 3: Interações (Comments + Polish)

- [ ] Comentários em perguntas (listar + criar + excluir)
- [ ] Comentários em respostas (listar + criar + excluir)
- [ ] Toast notifications para feedback
- [ ] Loading skeletons
- [ ] Empty states com ilustrações
- [ ] Optimistic updates

### Fase 4: Refinamento (UX + Performance)

- [ ] Página de perfil `/profile`
- [ ] Responsive design completo (mobile)
- [ ] Animações e transições (Framer Motion)
- [ ] SEO meta tags nas páginas de perguntas
- [ ] Error boundaries globais e por seção
- [ ] Testes com Playwright ou Cypress

---

## 10. Wireframes Textuais

### 10.1 Página de Login

```
┌──────────────────────────────────────────┐
│                                          │
│           🎓 Nest Clean Forum            │
│        Sua comunidade de perguntas       │
│                                          │
│     ┌────────────────────────────┐       │
│     │  📧 Email                  │       │
│     └────────────────────────────┘       │
│     ┌────────────────────────────┐       │
│     │  🔒 Senha                  │       │
│     └────────────────────────────┘       │
│                                          │
│     [        Entrar          ]           │
│                                          │
│     Não tem conta? Criar conta →         │
│                                          │
└──────────────────────────────────────────┘
```

### 10.2 Feed Principal

```
┌──────────────────────────────────────────────────────────────┐
│  🎓 Nest Forum    [🔍 Buscar...]        [+ Nova Pergunta] 👤│
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ ☰ Feed   │  Perguntas Recentes                    Página 1  │
│   Minhas │                                                   │
│   Perfil │  ┌─────────────────────────────────────────────┐ │
│          │  │ ● Nova                        há 5 min      │ │
│ ──────── │  │                                             │ │
│ 🌙 Tema  │  │ Como implementar Clean Arch no NestJS?      │ │
│          │  │ Estou tentando separar as camadas de...      │ │
│          │  │                                             │ │
│          │  │ 💬 2 respostas  💭 4 comentários            │ │
│          │  └─────────────────────────────────────────────┘ │
│          │                                                   │
│          │  ┌─────────────────────────────────────────────┐ │
│          │  │ ✅ Resolvida                    há 2 horas  │ │
│          │  │                                             │ │
│          │  │ JWT com RS256 - como gerar chaves?          │ │
│          │  │ Preciso configurar autenticação com...      │ │
│          │  │                                             │ │
│          │  │ 💬 5 respostas  💭 8 comentários            │ │
│          │  └─────────────────────────────────────────────┘ │
│          │                                                   │
│          │  [        Carregar mais perguntas        ]       │
│          │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

### 10.3 Detalhe da Pergunta

```
┌──────────────────────────────────────────────────────────────┐
│  🎓 Nest Forum    [🔍 Buscar...]        [+ Nova Pergunta] 👤│
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ ← Voltar │  Como implementar Clean Arch no NestJS?          │
│          │  por Luiz Silva · 5 min atrás · ● Nova           │
│          │                                                   │
│          │  Estou desenvolvendo uma API com NestJS e quero   │
│          │  aplicar os princípios de Clean Architecture.     │
│          │  Como posso separar as camadas de domínio,        │
│          │  aplicação e infraestrutura de forma eficiente?   │
│          │                                                   │
│          │  📎 diagrama-arch.png                             │
│          │                                                   │
│          │  [✏️ Editar] [🗑️ Excluir]                       │
│          │                                                   │
│          │  ── Comentários (2) ──────────────────────────── │
│          │  Ana: Boa pergunta, também tenho essa dúvida!    │
│          │  Pedro: Recomendo o curso do Rodrigo Manguinho   │
│          │  [💬 Adicionar comentário...]                     │
│          │                                                   │
│          │  ══ Respostas (3) ════════════════════════════════│
│          │                                                   │
│          │  ┌─ ✅ Melhor Resposta ────────────────────────┐ │
│          │  │ A melhor forma é usar o padrão de...        │ │
│          │  │ por Maria · 1 hora atrás                    │ │
│          │  │ 💭 3 comentários   [✏️] [🗑️]               │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                   │
│          │  ┌─────────────────────────────────────────────┐ │
│          │  │ Eu usaria inversão de dependência com...    │ │
│          │  │ por Carlos · 30 min atrás                   │ │
│          │  │ [☑️ Escolher melhor] 💭 1   [✏️] [🗑️]      │ │
│          │  └─────────────────────────────────────────────┘ │
│          │                                                   │
│          │  ── Sua Resposta ──────────────────────────────  │
│          │  ┌─────────────────────────────────────────────┐ │
│          │  │ Escreva sua resposta...                     │ │
│          │  │                                             │ │
│          │  └─────────────────────────────────────────────┘ │
│          │  [📎 Anexar]              [Enviar Resposta →]    │
│          │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

---

## 11. Considerações Técnicas Adicionais

### 11.1 Gerenciamento de Token

- Armazenar JWT em **memória** (Zustand store) para segurança
- Persistir em `localStorage` apenas se a UX exigir (com ciência do tradeoff de XSS)
- Interceptor no API client para adicionar `Authorization` header automaticamente
- Redirect para `/sign-in` em caso de 401

### 11.2 Caching com TanStack Query

```
- Perguntas recentes: staleTime 30s, refetch on focus
- Detalhe da pergunta: staleTime 60s
- Respostas/Comentários: staleTime 30s
- Invalidar cache após mutations (criar/editar/excluir)
```

### 11.3 SEO

- Páginas de detalhe de pergunta devem ter `<title>` e `<meta description>` dinâmicos
- Open Graph tags para compartilhamento em redes sociais
- Canonical URLs baseadas no slug

### 11.4 Performance

- Code splitting por rota (Next.js automático)
- Lazy loading de componentes pesados (editor, file upload)
- Imagens com `next/image` para otimização automática
- Prefetch de links visíveis no feed

---

## 12. Segurança — OWASP Top 10 & Práticas Modernas

### 12.1 Token Management

- JWT armazenado em **memória (Zustand)** — NÃO em `localStorage` (previne XSS token theft)
- `httpOnly cookie` como alternativa se SSR precisar do token server-side
- Token enviado via `Authorization: Bearer` header (imune a CSRF por design)
- Redirect automático para `/sign-in` em resposta 401
- Limpar token no logout (state + cookie)

### 12.2 OWASP Top 10 — Medidas Implementadas

| #   | Vulnerabilidade               | Medida no Frontend                                                                                                                                |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | **Broken Access Control**     | Auth guard no middleware Next.js; verificação de ownership antes de exibir botões edit/delete; nunca expor IDs de outros usuários em client state |
| A02 | **Cryptographic Failures**    | HTTPS obrigatório (HSTS header); nunca armazenar dados sensíveis no client; tokens apenas em memória                                              |
| A03 | **Injection (XSS)**           | React escapa output por padrão; Markdown renderizado via `react-markdown` + `rehype-sanitize` (whitelist de tags HTML); CSP headers no Next.js    |
| A04 | **Insecure Design**           | Validação Zod client-side **espelhando o backend** (dupla camada); não confiar apenas em validação client-side                                    |
| A05 | **Security Misconfiguration** | Security headers via `next.config.js` (CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy)                                  |
| A06 | **Vulnerable Components**     | Dependabot/Renovate para manter deps atualizadas; `npm audit` regular; lock file commitado                                                        |
| A07 | **Auth Failures**             | Debounce em tentativas de login; feedback genérico ("credenciais inválidas" sem detalhar qual campo); sem enum de usuários                        |
| A08 | **Data Integrity**            | Subresource Integrity em scripts externos; validar shape dos dados da API com Zod antes de renderizar                                             |
| A09 | **Logging & Monitoring**      | Error boundaries com reporting (Sentry ou similar); log de erros de auth no client                                                                |
| A10 | **SSRF**                      | Não fazer proxy de URLs arbitrárias; validar URLs de attachments com allowlist de domínios (R2/S3) antes de renderizar `<img>`                    |

### 12.3 Security Headers (next.config.js)

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.r2.cloudflarestorage.com data:; connect-src 'self' http://localhost:3333",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
]
```

### 12.4 Sanitização de Conteúdo

- **Markdown:** `react-markdown` + `rehype-sanitize` com whitelist de tags seguras
- **File upload:** Validação de tipo MIME + extensão no client antes de enviar ao backend
- **URLs de attachment:** Allowlist de domínios confiáveis (Cloudflare R2)
- **Forms:** Zod validation em todos os forms antes de submit

### 12.5 Proteção contra CSRF

- JWT em header (não cookie) = imune a CSRF por padrão
- Se migrar para cookie: `SameSite=Strict` + token CSRF adicional

---

## 13. Resumo Executivo

O backend Nest Clean Forum é uma API REST bem estruturada com **19 endpoints** cobrindo autenticação, CRUD de perguntas, respostas, comentários e upload de anexos. Utiliza **Clean Architecture** com separação rigorosa entre domínio e infraestrutura, **JWT RS256** para autenticação e **Prisma 7** com PostgreSQL.

O frontend proposto será construído com **Next.js 15 + Tailwind CSS 4 + shadcn/ui**, focando em uma experiência moderna, rápida e acessível de fórum Q&A. O design seguirá uma estética clean inspirada em produtos como GitHub Discussions e Stack Overflow, com dark mode, animações sutis e loading states elegantes.

A segurança segue as diretrizes **OWASP Top 10**, com JWT em memória, CSP headers, sanitização de Markdown, e validação dupla (client + server) em todos os inputs.

**Antes de iniciar a implementação**, recomenda-se resolver as **4 lacunas críticas** listadas na Seção 8.1, especialmente a habilitação de CORS e o enriquecimento dos presenters com dados do autor.
