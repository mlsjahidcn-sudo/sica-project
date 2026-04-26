# Active Context: Study In China Academy (SICA)

## Current Work Focus
Recent efforts have focused on:

1. **Project Initialization & Environment Setup**
   - Created `.env.local` with real Supabase, Moonshot, and Resend credentials
   - Installed all dependencies via `pnpm install` (95 packages)
   - TypeScript check passes with zero errors

2. **Configuration Fixes**
   - Disabled corrupting `.babelrc` (deprecated `next/babel` preset causing config corruption)
   - Renamed `next.config.js` → `next.config.ts` to avoid esbuild CJS interop issues
   - Dev server now runs clean without `__esModule`/`default` config warnings

3. **Runtime Error Fixes**
   - Fixed `next/image` remote hostname error for `static-data.gaokao.cn` by fixing the config loading pipeline
   - Supabase connection verified — all API endpoints returning 200

4. **Memory Bank Initialization**
   - Creating comprehensive project documentation

## Recent Changes
| Change | Status | Description |
|--------|--------|-------------|
| `.env.local` | ✅ Created | Populated with all service credentials |
| `pnpm install` | ✅ Complete | All dependencies resolved |
| `pnpm ts-check` | ✅ Passed | Zero TypeScript errors |
| `next.config.ts` | ✅ Renamed | Fixed config corruption from tsx/esbuild interop |
| `.babelrc` | ✅ Disabled | `.babelrc.disabled` — removed deprecated Babel preset |
| Dev server | ✅ Running | `http://localhost:5000` — all endpoints responsive |

## Next Steps
1. Phase 2: UI consistency improvements
2. Phase 3: Visual refresh (softer colors, reduced gradients)
3. Phase 4: Performance optimizations
4. Run test suite: `pnpm test:run`
5. Consider building for production: `pnpm build:next`

## Phase 1 Complete ✅ (2026-04-26)
| Fix | File |
|-----|------|
| Duplicate Account section in header mobile menu | `src/components/layout/header.tsx` |
| Dynamic stats in logo slider | `src/components/university-logo-slider.tsx` |
| Logo slider broken links | `src/components/university-logo-slider.tsx` |
| Testimonials pagination logic | `src/components/testimonials-section.tsx` |
| Error Boundary component | `src/components/error-boundary.tsx` |

## Active Decisions & Considerations
- **Babel removal**: `.babelrc` disabled but kept as `.babelrc.disabled` in case legacy compatibility is needed
- **Dev server command**: `npx tsx src/server.ts` works on Windows; `pnpm dev` requires bash/WSL
- **Node deprecated API**: `url.parse()` in `src/server.ts` triggers deprecation warning in Node 24 — recommend migration to WHATWG URL API
- **Missing tables**: `partner_showcases` and `testimonials` return empty gracefully but may need to be created via migration

## Important Patterns & Preferences
- All API routes follow the pattern: `src/app/api/[resource]/route.ts`
- Components are in `src/components/` with subdirectories for domain areas
- UI primitives in `src/components/ui/` (shadcn managed)
- Lib utilities in `src/lib/` with domain subdirectories
- Supabase client initialized in `src/lib/` modules
- TypeScript strict mode enforced
- pnpm-only package management