# SICA Public Pages Front-End Audit Report

**Date:** 2026-04-26
**Auditor:** Claude Code
**Scope:** Homepage, Universities Directory, University Details (public front-end only)

---

## Executive Summary

The SICA website's public pages are functional but suffer from several **functional bugs**, **UI/UX inconsistencies**, and **design issues** that impact user experience. This report documents all findings and provides a prioritized optimization roadmap.

---

## 🔴 HIGH PRIORITY - Functional Bugs

### 1. Duplicate Account Section in Mobile Menu

**File:** `src/components/layout/header.tsx`
**Lines:** 329-351
**Severity:** HIGH

**Issue:**
The mobile menu's account dropdown contains duplicate "Account" sections with identical "Sign In" links:

```tsx
// Line 330: First "Account" label
<DropdownMenuLabel>Account</DropdownMenuLabel>
<DropdownMenuItem asChild>
  <Link href="/login">Sign In</Link>  // First Sign In
</DropdownMenuItem>
...
// Line 344: Second "Account" label (DUPLICATE)
<DropdownMenuLabel>Account</DropdownMenuLabel>
<DropdownMenuItem asChild>
  <Link href="/login">Sign In</Link>  // Second Sign In (DUPLICATE)
</DropdownMenuItem>
```

**Impact:** Confusing UX, duplicate options, poor accessibility

**Fix Required:** Remove the duplicate section (lines 344-350)

---

### 2. Hardcoded Stats in Logo Slider

**File:** `src/components/university-logo-slider.tsx`
**Lines:** 180-197
**Severity:** HIGH

**Issue:**
Stats are hardcoded instead of being dynamic from API data:

```tsx
// These should come from API, not hardcoded
<div className="text-2xl sm:text-3xl font-bold text-primary">200+</div>  // Should be dynamic
<div className="text-2xl sm:text-3xl font-bold text-primary">39</div>      // Should be dynamic
<div className="text-2xl sm:text-3xl font-bold text-primary">115</div>     // Should be dynamic
<div className="text-2xl sm:text-3xl font-bold text-primary">31</div>       // Should be dynamic
```

**Impact:** Incorrect information if data changes, no synchronization with actual data

**Fix Required:** Calculate stats dynamically from university data

---

### 3. Missing Error Boundaries

**Files:** All public pages
**Severity:** HIGH

**Issue:**
No React Error Boundaries to gracefully handle API failures or render errors.

**Impact:** White screen of death on API failures, poor error recovery

**Fix Required:** Add ErrorBoundary components to all page sections

---

### 4. Inconsistent Testimonials Pagination Logic

**File:** `src/components/testimonials-section.tsx`
**Lines:** 276-284
**Severity:** MEDIUM

**Issue:**
Auto-slide assumes exactly 3 testimonials per page, but API may return any number:

```tsx
// This calculation assumes 3 items per page
const interval = setInterval(() => {
  setCurrentIndex((prev) => (prev + 1) % Math.ceil(testimonials.length / 3));
}, 5000);
```

**Impact:** Incorrect pagination behavior if testimonials count is not divisible by 3

**Fix Required:** Calculate items per page dynamically based on screen size or use responsive grid

---

### 5. Logo Slider Links to Non-Existent Routes

**File:** `src/components/university-logo-slider.tsx`
**Lines:** 142-144
**Severity:** MEDIUM

**Issue:**
Links use `university.slug` which may not exist:

```tsx
href={`/universities/${university.slug}`}
```

**Impact:** Broken links if slug is null

**Fix Required:** Fallback to `/universities/${university.id}` if slug is missing

---

## 🟠 MEDIUM PRIORITY - UI/UX Inconsistencies

### 6. Badge Proliferation on University Cards

**Files:** `src/app/(public)/universities/page.tsx`, `src/components/university-detail-content.tsx`
**Severity:** MEDIUM

**Issue:**
University cards display 4+ overlapping badges creating visual clutter:

- Ranking badge (top-left)
- Scholarship badge (top-right)
- Type badges (985, 211, etc.)
- "No Scholarship" badge when not available

**Recommendation:**
- Show maximum 2 badges per card
- Use ranking only if top 50
- Remove "No Scholarship" badge (negative information)

---

### 7. Inconsistent Card Hover States

**Files:** Multiple components
**Severity:** MEDIUM

**Issue:**
Different cards use different hover effects:

| Location | Hover Effect |
|----------|--------------|
| Featured Universities | `hover:-translate-y-0.5 hover:shadow-lg` |
| Bento Cards | `hover:-translate-y-0.5` |
| University Cards | `hover:shadow-lg hover:ring-2` |
| Partner Cards | `hover:shadow-lg` |

**Recommendation:** Standardize to consistent hover pattern

---

### 8. Color Classes vs Theme Tokens

**Files:** Multiple components
**Severity:** MEDIUM

**Issue:**
Hardcoded color classes instead of theme tokens:

```tsx
// Instead of theme-aware classes
className="bg-red-500/10 text-red-600 border-red-200"
className="bg-blue-500/10 text-blue-600 border-blue-200"

// Should use theme tokens or CSS variables
className="bg-destructive/10 text-destructive border-destructive"
```

**Recommendation:** Create theme-consistent color utilities

---

### 9. Missing Mobile Optimizations

**File:** `src/components/university-detail-content.tsx`
**Severity:** MEDIUM

**Issue:**
Mobile view has several issues:
- Sidebar hidden but takes space on tablet (between lg and hidden breakpoints)
- Deadline countdown card duplicated on mobile
- Tabs may overflow on small screens

---

### 10. Loading Skeleton Inconsistencies

**Files:** Multiple components
**Severity:** MEDIUM

**Issue:**
Different sections use different skeleton patterns:
- Some use `animate-pulse`
- Some use `animate-shimmer-slide`
- Some have no loading state

**Recommendation:** Standardize skeleton component usage

---

## 🟡 LOW PRIORITY - Layout & Usability

### 11. Silent Empty States

**File:** `src/components/partners-section.tsx`
**Lines:** 184-186
**Severity:** LOW

**Issue:**
Returns `null` silently when no partners:

```tsx
if (partners.length === 0) {
  return null;  // Should show a placeholder or message
}
```

---

### 12. Navigation Route Issues

**File:** `src/components/layout/header.tsx`
**Lines:** 455-462
**Severity:** LOW

**Issue:**
Mobile menu links to `/scholarships` but this route may not exist:

```tsx
<Link href="/scholarships" />  // Route may not exist
```

**Recommendation:** Verify all routes exist or update links

---

### 13. Font Loading Performance

**File:** `src/app/globals.css`
**Lines:** 101-103
**Severity:** LOW

**Issue:**
External fonts may impact load time:

```css
--font-sans: Ubuntu, ui-sans-serif, sans-serif, system-ui;
--font-serif: Geist Mono, monospace;
--font-mono: Geist Mono, monospace;
```

**Recommendation:** Consider system fonts or font-display: swap

---

### 14. Excessive Fetch Delays

**Files:** Multiple components
**Severity:** LOW

**Issue:**
Multiple 1-2.5 second delays before fetching data:

```tsx
// Logo slider: 1000ms delay
const timer = setTimeout(() => { fetchUniversities(); }, 1000);

// Testimonials: 1500ms delay
const timer = setTimeout(() => { fetchTestimonials(); }, 1500);

// Partners: 2000ms delay
const timer = setTimeout(() => { fetchPartners(); }, 2000);
```

**Impact:** Poor perceived performance, especially on first load

---

## 🎨 Design Principles - Natural, Human-Centric UI

### Current Issues with "AI-Generated" Aesthetic

1. **Over-saturated Colors**
   - Current: Heavy use of `primary/10` gradients, artificial blur effects
   - Problem: Feels synthetic, corporate, impersonal

2. **Badge Overload**
   - Current: "Featured", "Popular", "Trusted", "Fast", "Helpful", "Proven" everywhere
   - Problem: Adds no value, creates visual noise

3. **Icon Dependency**
   - Current: Heavy reliance on icons (IconBuilding, IconSchool, etc.)
   - Problem: Feels templated, lacks personality

4. **Gradient Overload**
   - Current: `bg-gradient-to-br from-primary/5 via-background to-background` everywhere
   - Problem: Artificial, cookie-cutter design

### Recommendations for Natural Design

1. **Use Real Photography**
   - Replace icon-heavy sections with actual university/campus photos
   - Show real student success stories with authentic photos

2. **Warm, Earthy Colors**
   - Replace synthetic blues with warmer tones
   - Use subtle, muted accent colors

3. **Readable Typography**
   - Natural reading rhythm with comfortable line heights
   - Consistent, restrained heading hierarchy

4. **Genuine Content**
   - Remove redundant badges and labels
   - Let real information (rankings, programs) speak for themselves

5. **Inclusive Design**
   - Softer contrasts for accessibility
   - Less aggressive color-coding

---

## Optimization Roadmap

### Phase 1: Critical Fixes (Estimated: 2-3 hours)
| # | Issue | Priority | Time |
|---|-------|----------|------|
| 1 | Fix duplicate Account section | 🔴 | 15 min |
| 2 | Dynamic stats in logo slider | 🔴 | 30 min |
| 3 | Add Error Boundaries | 🔴 | 45 min |
| 4 | Fix testimonials pagination | 🟠 | 30 min |
| 5 | Fix logo slider links | 🟠 | 15 min |

### Phase 2: UI Consistency (Estimated: 4-6 hours)
| # | Issue | Priority | Time |
|---|-------|----------|------|
| 6 | Standardize badge display | 🟠 | 60 min |
| 7 | Fix card hover states | 🟠 | 45 min |
| 8 | Use theme tokens | 🟠 | 90 min |
| 9 | Mobile optimizations | 🟠 | 60 min |
| 10 | Skeleton consistency | 🟡 | 30 min |

### Phase 3: Visual Refresh (Estimated: 6-8 hours)
| # | Issue | Priority | Time |
|---|-------|----------|------|
| 11 | Softer color palette | 🟡 | 120 min |
| 12 | Reduce gradient usage | 🟡 | 60 min |
| 13 | Typography improvements | 🟡 | 90 min |
| 14 | Add subtle micro-interactions | 🟡 | 60 min |
| 15 | Empty state designs | 🟡 | 30 min |

### Phase 4: Performance & Polish (Estimated: 3-4 hours)
| # | Issue | Priority | Time |
|---|-------|----------|------|
| 16 | Optimize fetch delays | 🟡 | 45 min |
| 17 | Font optimization | 🟢 | 30 min |
| 18 | Image optimization | 🟢 | 60 min |
| 19 | Accessibility audit | 🟢 | 60 min |

---

## Files Analyzed

1. `src/app/(public)/page.tsx` - Homepage
2. `src/components/home-page-content.tsx` - Homepage content
3. `src/app/(public)/universities/page.tsx` - Universities directory
4. `src/components/university-detail-content.tsx` - University details
5. `src/components/layout/header.tsx` - Navigation header
6. `src/components/layout/footer.tsx` - Footer
7. `src/components/university-logo-slider.tsx` - Logo slider
8. `src/components/testimonials-section.tsx` - Testimonials
9. `src/components/partners-section.tsx` - Partners section
10. `src/app/globals.css` - Global styles

---

## Conclusion

The SICA public pages are functional but need refinement for a polished, professional appearance. The critical bugs should be fixed immediately, followed by UI consistency improvements and gradual visual refresh.

The design should evolve from "template-generated" to "human-crafted" by:
- Using real photography and content
- Reducing visual noise (badges, gradients)
- Creating a warmer, more approachable aesthetic
- Prioritizing readability and accessibility

---

*End of Audit Report*
