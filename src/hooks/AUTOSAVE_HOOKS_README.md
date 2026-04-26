# Autosave Hooks Documentation

There are two autosave hooks in the codebase. They serve different purposes and should not be confused.

---

## 1. `useAutoSave` (use-auto-save.ts)

**Purpose:** Local storage draft persistence with optional remote sync

**Use Case:** Form data that should survive browser crashes, page refreshes, or accidental navigation

**Key Features:**
- Saves to `localStorage` with prefix `sica_draft_`
- Optional `onSave` callback for remote API sync
- Debounced with configurable delay (default: 2000ms)
- Draft recovery on page mount
- Timestamp tracking for drafts

**Example:**
```typescript
const { status, save, hasDraft, recoverDraft, discardDraft } = useAutoSave({
  data: formData,
  storageKey: 'student-profile',
  debounceMs: 2000,
  enabled: true,
  onSave: async (data) => {
    await saveToServer(data)
  },
  onRecover: (data) => {
    setFormData(data)
  },
})
```

**Export Location:** `src/hooks/use-auto-save.ts`

---

## 2. `useAutosave` (use-autosave.tsx)

**Purpose:** Remote API autosave with unsaved changes tracking

**Use Case:** Application drafts that need to be saved to the server for persistence across devices

**Key Features:**
- Saves to `/api/student/applications/{id}/autosave` endpoint
- Uses `getValidToken()` for authentication
- Tracks `hasUnsavedChanges` state
- Shows browser warning on page unload with unsaved changes
- Includes `AutosaveStatus` UI component for display

**Example:**
```typescript
const { debouncedSave, saveNow, state } = useAutosave({
  applicationId: '123',
  delay: 2000,
  onSave: (data) => console.log('Saved!', data),
  onError: (error) => console.error(error),
})

// Trigger on form changes:
debouncedSave({ personal_statement: '...', ... })
```

**Export Location:** `src/hooks/use-autosave.tsx`

**UI Component:**
```typescript
import { AutosaveStatus } from '@/hooks/use-autosave'

<AutosaveStatus 
  isSaving={state.isSaving}
  lastSavedAt={state.lastSavedAt}
  error={state.error}
  hasUnsavedChanges={state.hasUnsavedChanges}
/>
```

---

## When to Use Which

| Scenario | Hook |
|----------|------|
| User filling a long form, might close browser | `useAutoSave` |
| Save draft to localStorage only | `useAutoSave` |
| Application form with server persistence | `useAutosave` |
| Need unsaved changes warning on exit | `useAutosave` |
| Sync across devices | `useAutosave` |

---

## Utility Functions

Both hooks export utility functions:

**use-auto-save.ts:**
- `hasStoredDraft(storageKey)` - Check if draft exists
- `getDraftTimestamp(storageKey)` - Get when draft was last saved

**use-autosave.tsx:**
- Built-in `AutosaveStatus` component for UI feedback