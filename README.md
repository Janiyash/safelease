# SafeLease SaaS v2 — Full-Width UI + Complete Property Management

## What's new in v2 (UI Upgrade)

### Layout
- **Full-width layout** — removed all max-width containers, content fills the viewport
- `--content-px` CSS variable provides responsive horizontal padding
- `clamp(16px, 3vw, 40px)` spacing adapts from mobile to ultrawide screens

### Navbar (replaces sidebar)
- **Sticky top navbar** — `position: fixed`, `height: 62px`, glassmorphic `backdrop-filter`
- **Role-aware nav links** — Tenant / Owner / Admin each see different navigation items
- **Notification bell** — dropdown with unread count indicator + pulse animation
- **Profile dropdown** — avatar, name, role badge, settings, logout
- **Mobile hamburger menu** — collapses on screens < 768px
- **Role badge** — color-coded pill (Cyan=Tenant, Purple=Owner, Red=Admin)

### Property Cards
- Owner avatar (photo or initials with color) + "Property Owner" label
- Unsplash property images with hover zoom effect
- Hazard score badge with star icon
- Heart/favourite button
- Amenity tags (first 3 + overflow count)
- Status badge overlaid on image
- Action buttons (approve / assign tenant / delete) for managers

### New Components
| File | Purpose |
|------|---------|
| `Navbar.tsx` | Sticky top nav replacing sidebar |
| `PropertyCard.tsx` | Enhanced card with owner avatar |
| `SearchFilterBar.tsx` | Search input + status/bedroom filter chips |
| `Skeletons.tsx` | Shimmer loaders for all content types |
| `data/mockData.ts` | Rich demo data with Pravatar owner photos |

### Design System (`index.css`)
- **Fonts**: Clash Display (headings) + Satoshi (body) + JetBrains Mono (code)
- **Colors**: Semantic CSS variables (`--brand`, `--text-1..4`, `--surface`, `--border`)
- **Shadows**: `--shadow-xs/sm/md/lg/brand` system
- **Utilities**: `.card`, `.badge`, `.btn`, `.input`, `.skeleton`, `.filter-chip`, `.tag`, `.progress-track`, `.stats-grid`, `.property-grid`
- **Animations**: `fadeUp`, `shimmer`, `slideDown`, `scale-in` with `delay-1..5`

---

## Quick Start

```bash
# Backend
cd backend && npm install && cp .env.example .env
# Edit .env with your MongoDB URI + JWT secrets (see ENV SETUP guide)
npm run seed   # creates demo users
npm run dev    # http://localhost:5000

# Frontend (new terminal)
cd frontend && npm install && npm start
# http://localhost:3000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@safelease.com | Admin@1234 |
| Owner | owner@safelease.com | Owner@1234 |
| Tenant | tenant@safelease.com | Tenant@1234 |

## Frontend Folder Structure

```
src/
├── App.tsx                           ← Router + AppLayout (Navbar + content)
├── index.css                         ← Design system, CSS variables, utilities
├── api/
│   ├── client.ts                     ← Axios with auto token refresh
│   └── services.ts                   ← Typed API calls
├── components/
│   ├── navbar/Navbar.tsx             ← ★ NEW: Sticky top navbar
│   ├── auth/AuthPages.tsx            ← Login, Signup, Forgot Password
│   ├── dashboard/
│   │   ├── TenantDashboard.tsx       ← Property + complaints + notices
│   │   ├── OwnerDashboard.tsx        ← Portfolio + occupancy + complaints
│   │   └── AdminDashboard.tsx        ← Full analytics + charts
│   ├── properties/
│   │   ├── PropertyCard.tsx          ← ★ NEW: Card with owner avatar
│   │   └── PropertiesPage.tsx        ← Full CRUD + search + filter
│   ├── complaints/ComplaintsPage.tsx ← Raise, update, comment thread
│   ├── notices/NoticesPage.tsx       ← Create, pin, filter by category
│   ├── admin/UsersPage.tsx           ← User management + role change
│   ├── search/SearchFilterBar.tsx    ← ★ NEW: Search + filter chips
│   ├── skeleton/Skeletons.tsx        ← ★ NEW: Shimmer loaders
│   └── shared/index.tsx             ← Shared UI components
├── context/AuthContext.tsx           ← Global auth state
├── data/mockData.ts                  ← ★ NEW: Rich demo data w/ owner avatars
└── types/index.ts                    ← TypeScript interfaces
```
