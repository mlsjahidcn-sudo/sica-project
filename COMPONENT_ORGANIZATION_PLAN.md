# Component Organization Plan

## Current Structure
Root level has ~40 scattered components. Existing subdirectories:
- `admin/` - Admin specific
- `admin-v2/` - New admin components
- `auth/` - Auth components
- `chat/` - Chat components
- `layout/` - Layout (header, footer)
- `optimized/` - Optimized versions
- `partner-v2/` - Partner specific
- `programs/` - Program related
- `seo/` - SEO components
- `student-v2/` - Student specific
- `tasks/` - Task management
- `ui/` - Base UI components

---

## Proposed New Directories

### 1. `public/` - Public pages content
- `home-page-content.tsx`
- `partners-section.tsx`
- `testimonials-section.tsx`
- `section-cards.tsx`
- `university-logo-slider.tsx`

### 2. `dashboard/` - Dashboard components
- `dashboard-v2-cards.tsx`
- `dashboard-v2-chart.tsx`
- `dashboard-v2-header.tsx`
- `dashboard-v2-nav-docs.tsx`
- `dashboard-v2-nav-main.tsx`
- `dashboard-v2-nav-secondary.tsx`
- `dashboard-v2-nav-user.tsx`
- `dashboard-v2-sidebar.tsx`
- `dashboard-v2-table.tsx`
- `app-sidebar.tsx`

### 3. `navigation/` - Navigation components
- `breadcrumbs.tsx`
- `nav-main.tsx`
- `nav-secondary.tsx`
- `nav-user.tsx`
- `nav-documents.tsx`
- `notification-bell.tsx`

### 4. `shared/` - Shared/public components
- `program-detail-content.tsx`
- `university-detail-content.tsx`
- `site-header.tsx`
- `schema-org.tsx`
- `language-switcher.tsx`

### 5. `chat/` - Enhance existing chat
- `chat-markdown.tsx`
- `chat-program-card.tsx`
- `chat-university-card.tsx`
- `chat-widget.tsx`

### 6. `data/` - Data display components
- `data-table.tsx`
- `chart-area-interactive.tsx`

### 7. `widgets/` - Reusable widgets
- `favorite-button.tsx`
- `floating-assessment-button.tsx`
- `error-boundary.tsx`
- `providers.tsx`

### 8. `i18n/` - Internationalization
- Move from root or create dedicated

---

## Migration Strategy

### Phase 1: Create directories (non-breaking)
```bash
mkdir -p src/components/public src/components/dashboard src/components/navigation src/components/shared src/components/data src/components/widgets
```

### Phase 2: Move files with exports
- Create barrel exports in each directory
- Update imports in one module at a time
- Test after each move

### Phase 3: Update imports
- Search and replace old imports
- Run TypeScript check after each batch

---

## Implementation Notes

1. **Keep `ui/` as-is** - shadcn/ui base components should stay
2. **Keep domain-specific** (admin, partner, student) as-is
3. **Focus on shared/root components**
4. **Update imports incrementally**

This is a refactoring task - recommend doing it incrementally by feature/imports.