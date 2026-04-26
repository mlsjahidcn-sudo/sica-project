# System Patterns: Study In China Academy (SICA)

## Architecture Overview

The project follows Next.js 16 App Router architecture with a custom Node.js HTTP server that handles both HTTP and WebSocket connections.

```
┌─────────────────────────────────────────────────────────┐
│                    Custom Server (src/server.ts)          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Next.js App  │  │ WebSocket    │  │ HTTP Server      │ │
│  │ (app.handle) │  │ (ws)         │  │ (http.create)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘ │
└─────────┼─────────────────┼──────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Next.js App    │  │ WebSocket       │
│  Router         │  │ Endpoints:      │
│  ┌───────────┐  │  │ /ws/notifications│
│  │ (public)  │  │  │ /ws/partner     │
│  │ (auth)    │  │  └─────────────────┘
│  │ (student) │  │
│  │ (partner) │  │
│  │ admin     │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ API Routes│  │
│  └───────────┘  │
└─────────────────┘
```

## Key Architectural Patterns

### 1. Route Groups
Next.js route groups organize the app into logical sections:
- `(public)/` — Public-facing pages (home, universities, programs, blog, etc.)
- `(auth)/` — Authentication pages (login, register, forgot-password, etc.)
- `(student-v2)/` — Student portal pages (v2 layout)
- `(partner-v2)/` — Partner portal pages (v2 layout)
- `admin/` — Admin dashboard
- `api/` — API routes (all backend logic)

### 2. API Layer Pattern
Each API resource has its own directory under `src/app/api/[resource]/route.ts`.
API routes follow REST conventions:
- `GET /api/universities` — List universities
- `GET /api/universities/[id]` — Get single university
- `GET /api/programs` — List programs with filters
- `POST /api/applications` — Create application
- etc.

### 3. Component Architecture
- **UI Primitives**: `src/components/ui/` — shadcn-managed base components (button, card, input, etc.)
- **Domain Components**: `src/components/` — Business-logic components (home-page-content, university-logo-slider, etc.)
- **Layout Components**: `src/components/layout/` — Navigation, headers, footers
- **Admin Components**: `src/components/admin/` — Admin-specific components
- **Partner Components**: `src/components/partner-v2/` — Partner portal components
- **Student Components**: `src/components/student-v2/` — Student portal components
- **SEO Components**: `src/components/seo/` — Structured data, JSON-LD schemas

### 4. Data Flow Pattern
1. **Server Components** fetch data directly in async components
2. **Client Components** use `fetch()` or custom hooks to call API routes
3. **API Routes** interact with Supabase via `supabase-sql.ts` or `db-queries.ts`
4. **Supabase client** is initialized with service role key for server-side operations
5. **Real-time updates** flow through WebSocket connections

### 5. Authentication Pattern
- Multiple auth providers: email/password, magic link, partner auth
- Auth context (`src/contexts/auth-context.tsx`) manages session state
- Protected routes check auth status via middleware or page-level checks
- Partner auth uses separate context (`src/contexts/partner-context.tsx`)

### 6. State Management
- React Context for global auth state
- Custom hooks for specific concerns (useWebSocket, useDebounce, useOptimizedQuery)
- No external state management library

### 7. WebSocket Pattern
- Custom WebSocket server attached to the HTTP server
- Two endpoints: `/ws/notifications` and `/ws/partner`
- Notification handlers broadcast to connected clients by user ID

### 8. i18n Pattern
- `src/i18n/` directory for internationalization
- Language switcher component with locale toggle
- Supports English and Chinese

## Critical Implementation Paths

### Database Access
```typescript
// src/lib/supabase-sql.ts — Direct SQL via Supabase REST
// src/lib/db-queries.ts — ORM-style queries
// src/lib/direct-sql.ts — Raw PostgreSQL queries
```

### AI Integration
```typescript
// src/lib/llm.ts — Moonshot/Kimi K2.5 API integration
// src/app/api/chat/ — Chat API endpoint
// src/components/chat-widget.tsx — Floating chat UI
```

### File Storage
```typescript
// src/storage/ — AWS S3 integration for document uploads
// src/components/document-upload.tsx — Upload UI component
```

## Design Patterns in Use
- **Compound Components** — Radix UI patterns throughout
- **Server/Client Component Split** — Maximize server rendering
- **Route Groups** — Clean URL structure with organizational grouping
- **API Route Modules** — RESTful endpoint organization
- **Context Providers** — Auth and notifications state