# Project Brief: Study In China Academy (SICA)

## Overview
A full-stack web application for "Study In China Academy" (SICA) — a platform connecting international students with Chinese universities. Built with Next.js 16, shadcn/ui, and Supabase.

## Core Mission
Help international students discover Chinese universities, find suitable programs, apply for scholarships, and manage their study abroad journey end-to-end.

## Target Users
1. **International Students** — Browse universities/programs, apply, track applications
2. **Partner Agents/Organizations** — Manage student referrals, track applications
3. **Admin Team** — Manage universities, programs, students, partners, content

## Key Features
- University & program directory with search/filter
- Student portal (applications, documents, profile)
- Partner portal (referrals, team management, task management)
- Admin dashboard (full CRUD, analytics, user management)
- AI-powered chat assistant (Moonshot/Kimi K2.5 integration)
- Blog & success stories
- Assessment & eligibility checking
- Real-time notifications (WebSocket)
- Multi-language support (i18n)
- SEO optimized with structured data

## Technical Foundation
- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** shadcn/ui (Radix UI primitives) + Tailwind CSS v4
- **Database:** Supabase PostgreSQL (external project: `maqzxlcsgfpwnfyleoga`)
- **Package Manager:** pnpm (enforced via preinstall script)
- **Language:** TypeScript (strict mode)
- **Server:** Custom Node.js HTTP server with WebSocket support

## Development Status
Active development — multiple migrations applied, production-ready features implemented. See [progress.md](./progress.md) for detailed status.