# SICA Project Architecture Analysis & Optimization Report

**Date:** 2026-04-26  
**Status:** TypeScript: ✅ Passing | Build: ✅ Passing | Runtime: ✅ Working

---

## Executive Summary

This document provides a comprehensive analysis of the SICA (Study In China Academy) project codebase, identifying structural issues, disorganization patterns, and inefficiencies. It includes actionable recommendations for improvement while maintaining current functionality.

---

## Part 1: Current Architecture Overview

### Technology Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 16.1.1 |
| Language | TypeScript | 5.x (Strict Mode) |
| UI Components | shadcn/ui + Radix UI | Latest |
| Styling | Tailwind CSS | v4 |
| Database | Supabase PostgreSQL | External |
| Auth | Supabase Auth | - |
| AI/LLM | Moonshot Kimi K2.5 | - |
| Real-time | WebSocket (ws) | 8.20.0 |
| Package Manager | pnpm | 9.x |

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (public)/          # Public pages
│   ├── (student-v2)/      # Student portal
│   ├── (partner-v2)/      # Partner portal
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes (60+ endpoints)
│   ├── assessment/        # Assessment flows
│   └── chat/              # Chat interface
├── components/
│   ├── ui/               # shadcn primitives (90+)
│   ├── admin/             # Admin components
│   ├── partner-v2/       # Partner components
│   ├── student-v2/        # Student components
│   ├── layout/           # Header, footer
│   ├── seo/              # SEO components
│   └── [40+ root-level]  # Domain components
├── lib/                   # Utilities & business logic
│   ├── database/         # DB queries (490 lines)
│   ├── chat/             # RAG pipeline
│   ├── partner/          # Partner utilities
│   ├── types/            # Type definitions
│   └── validations/      # Zod schemas
├── contexts/             # React contexts (3)
├── hooks/                # Custom hooks (8)
├── storage/              # Database clients
└── ws-handlers/          # WebSocket handlers
```

---

## Part 2: Issues Identified

### 🔴 Critical Issues

#### 1. Deprecated Node.js API (FIXED ✅)
**File:** `src/server.ts`  
**Issue:** Used deprecated `url.parse()` from Node.js `url` module  
**Fix:** Replaced with WHATWG URL API (`new URL()`)  
**Status:** Fixed in this session

#### 2. Duplicate Hook Files
**Files:**
- `src/hooks/use-auto-save.ts` - Generic auto-save with localStorage
- `src/hooks/use-autosave.tsx` - API-based autosave for applications

**Note:** These serve different purposes and are NOT duplicates:
- `use-auto-save.ts` - Local draft persistence
- `use-autosave.tsx` - Remote API autosave with status UI

#### 3. Missing Database Tables
**Status:** Gracefully handled, but code attempts queries that return empty
- `partner_showcases` - Referenced but doesn't exist
- `testimonials` - Referenced but doesn't exist

### 🟡 Organizational Issues

#### 4. Component Scattering
40+ components at `src/components/` root level makes navigation difficult.

**Recommendation:** Organize into feature-based directories:
```
src/components/
├── shared/           # Cross-domain reusable components
├── home/            # Homepage-specific
├── universities/    # University-related
├── programs/        # Program-related
├── chat/            # Chat widgets
└── [keep ui/ separate for shadcn]
```

#### 5. API Route Duplication
Some resource operations exist in multiple locations:
- `/api/applications` - Main applications API
- `/api/student/applications` - Student-specific wrapper
- `/api/admin/individual-applications` - Admin view

**Note:** This is often intentional for role-specific logic, but could be consolidated with middleware.

#### 6. Type Definitions Scattered
Types defined in multiple locations:
- `src/lib/types/` - Centralized types
- `src/lib/student-api.ts` - 400+ lines of inline types
- `src/contexts/auth-context.tsx` - Inline User/Session
- `src/lib/auth-utils.ts` - Inline User interface

**Recommendation:** Extract all types to `src/lib/types/` with barrel exports.

### 🟢 Performance Issues

#### 7. Duplicate Database Queries
Some API routes execute separate count + data queries when a single query could suffice.

**Example (universities/route.ts):**
```typescript
// Current: Two separate queries
const [countResult, dataResult] = await Promise.all([
  countQuery,
  dataQuery,
]);
```

**Optimization:** For small result sets, include count in a single query using `count: 'exact'`.

#### 8. No Query Result Deduplication
While `src/lib/request-dedup.ts` exists, it's not consistently used across API routes.

---

## Part 3: Well-Designed Patterns (Keep These)

### ✅ Database Access Layer
`src/storage/database/supabase-client.ts` is well-designed:
- Singleton pattern for server client
- User-scoped clients with tokens
- Custom timeout fetch (60s)
- Build-time placeholder credentials
- Used consistently across 183 API routes

### ✅ Auth System
- Centralized auth context with token refresh
- Proactive token refresh (5 min before expiry)
- Deduplicated concurrent refresh calls
- Partner auth context separate from main auth

### ✅ Rate Limiting
- Centralized `src/lib/rate-limit.ts`
- Preset configurations (api, search, auth, chat)
- Redis fallback support
- Detailed error responses

### ✅ API Response Standardization
- Centralized `src/lib/api-response.ts`
- Consistent error formatting
- Type-safe response helpers

### ✅ Caching Layer
- `src/lib/api-cache.ts` with TTL support
- Cache warming for hot data
- Consistent cache key generation

---

## Part 4: Actionable Recommendations

### Immediate (Low Effort, High Impact)

1. **Create barrel exports for types**
   ```typescript
   // src/lib/types/index.ts
   export * from './user';
   export * from './api';
   export * from './student';
   // etc.
   ```

2. **Document the Auto-save Hooks**
   Both hooks are intentionally different. Add JSDoc comments explaining:
   - `use-auto-save.ts` - Local draft only
   - `use-autosave.tsx` - Remote API sync with UI

3. **Create Missing Tables Migration**
   Either create `partner_showcases` and `testimonials` tables or remove references.

### Short-term (Moderate Effort)

4. **Component Organization**
   Move domain components to subdirectories:
   ```
   src/components/
   ├── shared/           # FavoriteButton, Badge, etc.
   ├── home/             # LogoSlider, Testimonials, etc.
   └── [feature]/        # Feature-specific
   ```

5. **API Middleware Consolidation**
   Create role-based middleware to reduce duplicate logic:
   ```typescript
   // src/lib/middleware/withAuth.ts
   export function withAuth(roles?: string[]) {
     return (handler) => async (req) => {
       const user = await verifyAuthToken(req);
       if (!user) return errors.unauthorized();
       if (roles && !roles.includes(user.role)) return errors.forbidden();
       return handler(req, user);
     };
   }
   ```

6. **Shared API Response Helpers**
   Consolidate into a single response utilities module:
   ```typescript
   // src/lib/api/utils.ts
   export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
     return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
   }
   ```

### Long-term (High Effort, Strategic)

7. **Query Builder Pattern**
   Consider a unified query builder for consistent patterns:
   ```typescript
   // src/lib/database/query-builder.ts
   export class QueryBuilder<T> {
     static for(table: string): QueryBuilder<T>;
     select(...fields: string[]): this;
     where(conditions: Record<string, unknown>): this;
     paginate(page: number, limit: number): this;
     async execute(): Promise<{ data: T[]; count: number }>;
   }
   ```

8. **Feature Flags System**
   For gradual rollouts and A/B testing:
   ```typescript
   // src/lib/feature-flags.ts
   export const features = {
     newDashboard: process.env.NEXT_PUBLIC_FF_NEW_DASHBOARD === 'true',
     aiChat: true,
   };
   ```

9. **Comprehensive Test Coverage**
   Current: Unit tests exist, E2E with Playwright
   Missing: Integration tests for API routes, component tests

---

## Part 5: Database Schema Observations

### Well-designed Tables
- `applications` with `profile_snapshot` JSONB for flexible data
- `chat_sessions` + `chat_messages` for conversation history
- `tasks` with subtasks, comments, attachments
- RLS policies for row-level security

### Schema Improvement Opportunities

1. **Indexes:** Ensure indexes on:
   - `applications(student_id, status)` for filtered queries
   - `universities(province, type)` for filtered searches
   - `chat_messages(session_id, created_at)` for history queries

2. **JSONB Usage:** Consider extracting frequently-queried fields:
   - `profile_snapshot.personal_statement` → separate column
   - `profile_snapshot.intake` → separate column

3. **Foreign Keys:** Review FK constraints for data integrity

---

## Part 6: Security Observations

### ✅ Strengths
- RLS policies on all tables
- Service role key used server-side only
- Rate limiting on sensitive endpoints
- Token refresh with proper expiration handling
- Parameterized queries (no SQL injection risk)

### ⚠️ Recommendations
1. Add CSRF protection for non-GET requests
2. Implement request signing for webhook endpoints
3. Add IP-based rate limiting for brute force protection
4. Audit log for sensitive operations (admin actions, data exports)

---

## Part 7: Performance Optimizations Applied

### Fixed in This Session
- ✅ Replaced deprecated `url.parse()` with WHATWG URL API in `src/server.ts`

### Suggested Additional Optimizations
1. **Database Connection Pooling**
   - Current: Single connection singleton
   - Consider: Pool size configuration for high traffic

2. **Query Optimization**
   - Use `select('*', { count: 'exact' })` for combined count+data
   - Add `explain()` analysis for slow queries

3. **Caching Strategy**
   - Implement cache warming for hot data (universities, programs)
   - Use SWR/React Query for client-side caching

4. **Image Optimization**
   - Next.js Image component already in use
   - Consider CDN for static assets

---

## Conclusion

The SICA project has a solid architectural foundation with well-designed database access, auth, and API patterns. The main opportunities for improvement are:

1. **Organizational:** Component scattering, type centralization
2. **Consistency:** API response patterns, middleware consolidation  
3. **Performance:** Query optimization, caching enhancements
4. **Documentation:** Architectural decisions, component purpose

The codebase is production-ready with proper TypeScript typing, error handling, and security measures in place. Incremental improvements following the recommendations above will enhance maintainability without disrupting current functionality.

---

## Appendix: File Statistics

| Category | Count |
|----------|-------|
| API Routes | 60+ |
| Components (UI) | 90+ |
| Components (Domain) | 40+ |
| Database Migrations | 31 |
| Hooks | 8 |
| Contexts | 3 |
| Lib Modules | 25+ |
| Test Files | ~10 |

**Total Source Files:** ~250+  
**TypeScript Errors:** 0 ✅  
**Build Status:** Passing ✅
