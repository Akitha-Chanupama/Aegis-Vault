# Aegis Vault - UI & UX Design System Specification

## 1. Visual Personality & Design Tokens

Aegis Vault features a quiet, disciplined, high-fidelity aesthetic inspired by modern privacy-focused cryptographic tools. It balances technical precision with calm usability.

### 1.1 Color Tokens & WCAG 2.2 AA Contrast Ratios

```css
:root {
  /* Dark Theme (Primary Default) */
  --bg-app: #0B1020;            /* Midnight Navy Canvas */
  --surface-1: #121A2A;         /* Slate Card Surface */
  --surface-2: #192338;         /* Raised / Hover Surface */
  --surface-3: #222E48;         /* Active / Dialog Surface */
  --border-subtle: #242F46;     /* Subtle Dividers */
  --border-strong: #374669;     /* Interactive Element Borders */

  --text-primary: #F8FAFC;      /* Primary Headings & Data (Contrast > 15:1 against --bg-app) */
  --text-secondary: #CBD5E1;    /* Body & Labels (Contrast 11.2:1) */
  --text-muted: #94A3B8;        /* Metadata & Captions (Contrast 5.4:1 - Passes AA 4.5:1 min) */

  --accent: #8B7CF6;            /* Iris Accent (Contrast 4.6:1 against dark surface) */
  --accent-hover: #A79AFB;      /* Light Accent on Hover */
  --accent-muted: rgba(139, 124, 246, 0.15); /* Tinted pill background */

  --success: #34D399;           /* Emerald for verified, synced states */
  --warning: #FBBF24;           /* Amber for expiring passwords or warnings */
  --danger: #F87171;            /* Coral Red for destructive actions */

  /* Radius & Shadows */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.35);
  --shadow-dropdown: 0 10px 30px -4px rgba(0, 0, 0, 0.5);
}

[data-theme="light"] {
  --bg-app: #F8FAFC;
  --surface-1: #FFFFFF;
  --surface-2: #F1F5F9;
  --surface-3: #E2E8F0;
  --border-subtle: #E2E8F0;
  --border-strong: #CBD5E1;

  --text-primary: #0F172A;      /* Contrast > 16:1 */
  --text-secondary: #334155;    /* Contrast 9.5:1 */
  --text-muted: #64748B;        /* Contrast 4.7:1 - Passes AA */

  --accent: #6366F1;
  --accent-hover: #4F46E5;
  --accent-muted: rgba(99, 102, 241, 0.1);

  --success: #059669;
  --warning: #D97706;
  --danger: #DC2626;
}
```

### 1.2 Typography
- **Primary Font:** Inter / Geist / system sans-serif (`font-sans`), optimized with `-webkit-font-smoothing: antialiased`.
- **Monospace Font:** JetBrains Mono / Fira Code (`font-mono`) for credentials, OTP tokens, recovery codes, and cryptographic hashes.

---

## 2. Layouts & Responsiveness

### 2.1 Desktop Viewports ($\ge 1024\text{px}$)
- **Left Sidebar (260px wide):**
  - Brand header with vault lock status indicator.
  - Primary navigation links: Dashboard, Passwords, Secure Notes, Private Photos, Documents, Records, Favorites, Trash.
  - Storage quota gauge and user profile menu.
  - Keyboard shortcut hints (`Ctrl+K` for search, `Ctrl+N` for quick add).
- **Header:** Global in-memory search bar, "Quick Add" trigger button, sync indicator, and instant "Lock" action.
- **Main Viewport:** Fluid multi-column cards or responsive list views.
- **Detail Panel (Right Drawer, 440px):** Slides out for inspecting, editing, or viewing entries without leaving the list context.

### 2.2 Mobile Viewports ($320\text{px} - 767\text{px}$)
- **Sticky Top Bar:** Vault title, search toggle, and lock button.
- **Single-Column Content:** Fluid cards with clear touch targets.
- **Bottom Navigation Bar (5 Primary Destinations):**
  1. `Home` (Dashboard & quick shortcuts)
  2. `Vault` (Unified searchable list with filter pills)
  3. `+ Add` (Prominent center quick-add bottom sheet trigger)
  4. `Gallery` (Private photos & media)
  5. `Settings` (Security, sessions, auto-lock, export)
- **Ergonomics & Touch Requirements:**
  - Minimum touch target: 44 x 44 CSS pixels.
  - Safe-area inset integration: `padding-bottom: calc(env(safe-area-inset-bottom) + 12px)`.
  - Password reveal and copy buttons sized for thumb access.
  - Mobile bottom sheets for item details, edit forms, and action dialogs.

---

## 3. The 16 Mandatory Application Screens

| # | Screen Name | Key Purpose & Interactive Elements |
|---|---|---|
| 1 | **Welcome / Auth** | Single-owner login with email/passkey; clear notice of zero-knowledge architecture. No marketing clutter. |
| 2 | **First-Run Setup** | Step-by-step vault initialization; setting strong vault passphrase with live entropy meter. |
| 3 | **Recovery Onboarding** | Generates 24-word recovery phrase; download/copy confirmation before unlocking empty vault. |
| 4 | **Locked Vault Screen** | Clean security lock screen; passphrase input, KDF derivation indicator, quick emergency reset link. |
| 5 | **Home Dashboard** | High-level summary: total items, security score, recently modified items, quick-action tiles. |
| 6 | **Unified Vault List** | Searchable multi-type list with category filter pills, sorting (name, updated, created), and bulk actions. |
| 7 | **Password Manager** | Credential cards with masked passwords, one-click copy, reveal toggle, password generator tool, URL launcher. |
| 8 | **Secure Notes** | Rich sanitized note editor with auto-save badge, markdown support, tag management, word counts. |
| 9 | **Private Gallery** | 2-3 column responsive encrypted photo grid, lightbox viewer with ephemeral blob URLs, EXIF strip info. |
| 10 | **Documents & Files** | File locker with drag-and-drop upload zone, chunked upload progress bars, download action, size indicators. |
| 11 | **Personal Records** | Custom key-value record templates (ID cards, driver licenses, software licenses, Wi-Fi credentials). |
| 12 | **Favorites & Trash** | Filtered favorites view; 30-day trash view with "Restore" and "Permanently Delete" safeguards. |
| 13 | **Security & Sessions** | List of active client sessions with IP/device user-agent, remote revoke button, auto-lock timeout slider. |
| 14 | **Settings & Profile** | Dark/light/system theme picker, email display, master passphrase change wizard with KEK rewrap. |
| 15 | **Export & Restore** | Client-side encrypted JSON/archive export; backup restore validation wizard with collision safeguards. |
| 16 | **System States** | Polished UI states for Empty, Skeleton Loading, Offline Warning, Revision Conflict Dialog, and Network Errors. |

---

## 4. Reusable Component Library Architecture

The design system will reside in `apps/web/components/vault/` and follow atomic composition:
- `AppShell`: Handles desktop vs mobile layout switching, sidebar, bottom tab bar, and lock-screen overlay.
- `VaultLockScreen`: Fullscreen pin/passphrase entry modal with KDF spinner.
- `SecretField`: Masked credential input with one-click copy feedback and 10s auto-hide timer.
- `PasswordGenerator`: Configurable generator (length 8-64, uppercase, lowercase, numbers, symbols) with entropy calculation.
- `SearchCommand`: Global `Cmd+K` palette filtering through in-memory decrypted items.
- `UploadDropzone`: Drag-and-drop zone with MIME validation and encrypted chunking progress bar.
- `ConfirmDialog`: Radix UI alert dialog for permanent deletion and destructive key actions.
- `SyncStatus`: Subtle badge showing "Synced", "Syncing...", or "Offline (Cached)".
