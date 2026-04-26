# Tech Context: Study In China Academy (SICA)

## Technology Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| **Framework** | Next.js | 16.1.1 | App Router, Turbopack |
| **Language** | TypeScript | 5.x | Strict mode |
| **UI Library** | React | 19.2.3 | Server & Client Components |
| **UI Components** | shadcn/ui | — | Radix UI primitives |
| **Styling** | Tailwind CSS | v4 | PostCSS, CSS variables |
| **Database** | Supabase (PostgreSQL) | — | External project |
| **ORM** | Drizzle ORM | 0.45.1 | Schema & migrations |
| **Package Manager** | pnpm | 9.0.0 | Enforced via preinstall |
| **Auth** | Supabase Auth | — | Email/password, magic link |
| **AI/LLM** | Moonshot Kimi K2.5 | — | Chat assistant via OpenAI SDK |
| **Email** | Resend | 6.10.0 | Transactional emails |
| **Real-time** | ws (WebSocket) | 8.20.0 | Custom server |
| **File Storage** | AWS S3 | SDK v3 | Document uploads |
| **Testing** | Vitest + Playwright | 4.1.5 / 1.59.1 | Unit + E2E |
| **Linting** | ESLint | 9.x | Next.js config |
| **Dev Server** | tsx | 4.21.0 | TypeScript execution |
| **Build Tool** | tsup | 8.3.5 | API bundling |
| **Forms** | react-hook-form | 7.70.0 | + Zod validation |
| **Charts** | Recharts | 3.8.0 | Dashboard analytics |
| **Tables** | @tanstack/react-table | 8.21.3 | Data tables |
| **Icons** | Tabler + Lucide | — | Icon libraries |
| **Deployment** | Docker + Hostinger | — | Dockerfile, docker-compose |

## Development Setup

### Prerequisites
- Node.js 20+ (v24.13.0 used)
- pnpm 9+
- Access to Supabase project `maqzxlcsgfpwnfyleoga`

### Environment Variables (`.env.local`)
Required variables (all populated):
```
COZE_SUPABASE_URL          — https://maqzxlcsgfpwnfyleoga.supabase.co
COZE_SUPABASE_ANON_KEY     — Public anon key
COZE_SUPABASE_SERVICE_ROLE_KEY — Admin service role key
DATABASE_URL               — Direct PostgreSQL connection string
MOONSHOT_API_KEY           — Moonshot/Kimi API key
MOONSHOT_BASE_URL          — https://api.moonshot.cn/v1
MOONSHOT_MODEL             — kimi-k2.5
RESEND_API_KEY             — Resend email API key
EMAIL_FROM                 — Team SICA <info@studyinchina.academy>
ADMIN_EMAIL                — admin@studyinchina.academy
```

### Available Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm dev` | `bash ./scripts/dev.sh` | Dev server (Unix/WSL) |
| `pnpm build:next` | `next build` | Next.js production build |
| `pnpm start` | `node .next/standalone/server.js` | Production server |
| `pnpm ts-check` | `tsc -p tsconfig.json` | TypeScript check |
| `pnpm test` | `vitest` | Run tests (watch mode) |
| `pnpm test:run` | `vitest run` | Run tests once |
| `pnpm lint` | `eslint` | Lint code |
| `pnpm build:pnpm` | `bash ./scripts/build.sh` | Build with pnpm |

### Dev Server (Windows)
Use `npx tsx src/server.ts` instead of `pnpm dev` on Windows cmd.exe.

## Database Schema (Supabase)

Key tables (via migrations):
- **universities** — University directory
- **programs** — Academic programs
- **scholarships** — Scholarship data
- **applications** — Student applications
- **students** — Student profiles
- **partners** — Partner organizations
- **partner_team_members** — Partner team management
- **tasks** — Task management
- **leads** — Lead management
- **blog_posts** — Blog content
- **blog_categories** — Blog categorization
- **success_cases** — Student success stories
- **assessments** — Eligibility assessments
- **notifications** — Notification records
- **documents** — Uploaded documents
- **internal_applications** — Internal application tracking
- **activity_log** — Audit trail

## Technical Constraints

1. **Supabase dependency** — App cannot function without external Supabase connection
2. **Windows limitations** — `bash` scripts don't work on cmd.exe; tsx direct execution needed
3. **Babel removal** — `.babelrc` disabled; not compatible with Next.js 16 Turbopack
4. **Node.js 24 deprecations** — `url.parse()` used in server.ts triggers deprecation warning
5. **Missing database tables** — `partner_showcases` and `testimonials` don't exist yet

## External Dependencies
- Supabase (database + auth)
- Moonshot API (Kimi K2.5 LLM)
- Resend (email delivery)
- AWS S3 (file storage — configured but usage TBD)