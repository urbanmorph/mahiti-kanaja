# Mahiti Kanaja — Technical Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN (Vercel Edge)                        │
├─────────────────────────────────────────────────────────────────┤
│                     Next.js 15 (App Router)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Pages   │  │   API    │  │  i18n    │  │  Auth (opt)  │   │
│  │ (SSG/ISR)│  │  Routes  │  │  Engine  │  │  NextAuth    │   │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────────┘   │
│       │              │                                          │
│  ┌────┴──────────────┴──────────────────────────────────────┐  │
│  │              React Server Components                      │  │
│  │   ┌──────────┐  ┌───────────┐  ┌────────────────────┐   │  │
│  │   │ Shadcn   │  │ Recharts/ │  │  React-Leaflet /   │   │  │
│  │   │ UI       │  │ Nivo      │  │  Mapbox GL         │   │  │
│  │   └──────────┘  └───────────┘  └────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
│  ┌──────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ Supabase │  │  ETL Workers  │  │  Cache (Redis/Upstash) │  │
│  │ Postgres │  │  (Cron jobs)  │  │                        │  │
│  └──────────┘  └───────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSG for static pages, ISR for data pages, API routes for backend. One deployment target. |
| **Language** | TypeScript 5 | Type safety across data models — critical when dealing with 450+ service schemas |
| **UI Components** | shadcn/ui + Tailwind CSS 4 | Accessible primitives (Radix UI underneath), fully customizable. No vendor lock-in. |
| **Charts** | Recharts + Nivo | Recharts for standard bar/line/pie. Nivo for complex choropleth maps and treemaps. Both are React-native, SSR-compatible. |
| **Maps** | React-Leaflet + OpenStreetMap | Free, open-source. Karnataka district/taluk boundaries available via Datameet shapefiles. No API key cost. |
| **Tables** | TanStack Table v8 | Headless, virtualised — handles 10k+ rows for large beneficiary datasets. Server-side pagination. |
| **Search** | Fuse.js (client) + Postgres full-text (server) | Client-side fuzzy search for service directory (<500 items). Server-side FTS for beneficiary/data lookups. |
| **Forms** | React Hook Form + Zod | Validation for service lookup forms (district/taluk/GP selectors, search queries). |
| **i18n** | next-intl | First-class Next.js App Router support. Kannada + English. Message bundles per route. |
| **Icons** | Lucide React | Tree-shakeable, consistent with shadcn/ui. Already used in the mockup's design language. |
| **Animations** | Framer Motion | Scroll-triggered reveals, page transitions, chart entry animations. |

### Backend & Data
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Database** | Supabase (Postgres) | Free tier is sufficient for prototype. Row-Level Security for future auth. PostGIS for geo queries. |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent Postgres support. Generates migrations. |
| **Cache** | Upstash Redis | Serverless Redis. Cache scraped data, rate limit API routes. Free tier = 10k requests/day. |
| **ETL / Scraping** | Playwright (headless) + Cheerio | Many Mahiti Kanaja pages are server-rendered HTML. Playwright for JS-heavy pages, Cheerio for static HTML. |
| **Cron** | Vercel Cron / GitHub Actions | Scheduled ETL runs: daily for pensions/scholarships, weekly for infrastructure projects. |
| **File Storage** | Supabase Storage | Store scraped CSV snapshots, map GeoJSON files, and report PDFs. |
| **API** | Next.js Route Handlers + tRPC | Type-safe API layer. tRPC for internal frontend↔backend. REST route handlers for public open-data API. |

### Infrastructure
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Hosting** | Vercel | Zero-config Next.js deployment. Edge functions for i18n routing. Free tier covers prototype traffic. |
| **CI/CD** | GitHub Actions | Lint → Type-check → Test → Build → Deploy. Preview deployments on every PR. |
| **Monitoring** | Vercel Analytics + Sentry | Core Web Vitals tracking, error monitoring. Both have free tiers. |
| **Testing** | Vitest + Playwright | Vitest for unit/integration. Playwright for E2E (service lookup flows, dashboard interactions). |

---

## Project Structure

```
mahiti-kanaja/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── [locale]/                 # i18n wrapper (en, kn)
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── services/
│   │   │   │   ├── page.tsx          # All services directory
│   │   │   │   └── [slug]/page.tsx   # Individual service page
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # Main transparency dashboard
│   │   │   │   ├── spending/page.tsx # Fund allocation views
│   │   │   │   ├── schemes/page.tsx  # Scheme beneficiary tracker
│   │   │   │   └── projects/page.tsx # Infrastructure project map
│   │   │   ├── explore/
│   │   │   │   ├── by-location/page.tsx
│   │   │   │   ├── by-department/page.tsx
│   │   │   │   └── by-life-event/page.tsx
│   │   │   ├── eligibility/page.tsx  # Scheme eligibility checker
│   │   │   └── open-data/page.tsx    # Downloadable datasets + API docs
│   │   └── api/
│   │       ├── v1/                   # Public REST API
│   │       │   ├── services/route.ts
│   │       │   ├── spending/route.ts
│   │       │   ├── schemes/route.ts
│   │       │   └── projects/route.ts
│   │       ├── trpc/[trpc]/route.ts  # tRPC handler
│   │       └── cron/                 # Cron-triggered ETL endpoints
│   │           ├── scrape-pensions/route.ts
│   │           ├── scrape-scholarships/route.ts
│   │           └── scrape-projects/route.ts
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── top-bar.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── home/
│   │   │   ├── hero.tsx
│   │   │   ├── quick-access-grid.tsx
│   │   │   ├── pathways.tsx
│   │   │   ├── dashboard-preview.tsx
│   │   │   └── schemes-section.tsx
│   │   ├── dashboard/
│   │   │   ├── spending-chart.tsx
│   │   │   ├── scheme-donut.tsx
│   │   │   ├── project-map.tsx
│   │   │   ├── district-comparison.tsx
│   │   │   └── trend-line.tsx
│   │   ├── services/
│   │   │   ├── service-card.tsx
│   │   │   ├── service-grid.tsx
│   │   │   ├── location-selector.tsx # District → Taluk → GP cascade
│   │   │   └── search-autocomplete.tsx
│   │   └── shared/
│   │       ├── data-table.tsx        # TanStack Table wrapper
│   │       ├── stat-card.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── error-boundary.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema
│   │   │   ├── migrations/
│   │   │   └── seed.ts              # Initial data seed
│   │   ├── scraper/
│   │   │   ├── pension-scraper.ts
│   │   │   ├── scholarship-scraper.ts
│   │   │   ├── project-scraper.ts
│   │   │   └── utils.ts             # Retry, rate-limit, parsing helpers
│   │   ├── trpc/
│   │   │   ├── router.ts
│   │   │   └── context.ts
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   └── kn.json
│   │   └── utils/
│   │       ├── format.ts            # Number/currency/date formatting (INR, Indian number system)
│   │       ├── geo.ts               # Karnataka boundary helpers
│   │       └── constants.ts         # District codes, department IDs, etc.
│   ├── data/
│   │   ├── services.json            # Static service catalog (450+ entries)
│   │   ├── departments.json         # 30+ department metadata
│   │   ├── districts.json           # 31 districts with taluk/GP hierarchy
│   │   ├── karnataka.geojson        # District boundaries for maps
│   │   └── life-events.json         # Life event → service mappings
│   └── styles/
│       └── globals.css              # Tailwind base + design tokens
├── public/
│   ├── emblems/                     # Karnataka state emblem, department logos
│   └── og/                          # Open Graph images
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── seed-db.ts                   # One-time data import
│   ├── scrape-all.ts                # Manual full scrape
│   └── generate-geojson.ts          # Process Datameet shapefiles
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint + Test + Build
│       ├── deploy.yml               # Auto-deploy to Vercel
│       └── etl-cron.yml             # Scheduled data refresh
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Phase Implementation Details

### Phase 1: Foundation & Information Architecture (Weeks 1–4)

#### 1.1 Project Bootstrap (Week 1)
```bash
npx create-next-app@latest mahiti-kanaja --typescript --tailwind --app --src-dir
npx shadcn@latest init
```

**Tasks:**
- Initialize Next.js 15 with TypeScript, Tailwind CSS 4, App Router
- Install and configure shadcn/ui (New York style, Karnataka Red as primary)
- Set up next-intl with English and Kannada locales
- Configure ESLint, Prettier, Husky pre-commit hooks
- Set up Vitest + Playwright
- Create GitHub Actions CI pipeline
- Deploy skeleton to Vercel

**Design Token Configuration (tailwind.config.ts):**
```typescript
// Extending the mockup's design system into Tailwind
const config = {
  theme: {
    extend: {
      colors: {
        karnataka: {
          red: '#C41E3A',
          'red-dark': '#9B1830',
          'red-light': '#F8E8EB',
          gold: '#FFD700',
          'gold-muted': '#F5C518',
          'gold-light': '#FFF9E0',
          ink: '#1A1A2E',
          'ink-light': '#3D3D56',
          'ink-muted': '#6B6B80',
        },
      },
      fontFamily: {
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
}
```

#### 1.2 Static Data Modeling (Week 1–2)

**Service Catalog Schema:**
```typescript
// src/lib/db/schema.ts
interface Service {
  id: string;                    // e.g., "pension-status"
  name_en: string;
  name_kn: string;
  description_en: string;
  description_kn: string;
  department_id: string;
  sector: Sector;                // enum: 19 sectors
  category: 'lookup' | 'transaction' | 'information' | 'download';
  url: string;                   // deep link to actual service
  is_external: boolean;          // true if redirects to another portal
  external_portal?: string;      // e.g., "Seva Sindhu", "ahara.kar.nic.in"
  inputs: ServiceInput[];        // what the user needs to provide
  granularity: 'state' | 'district' | 'taluk' | 'gp' | 'individual';
  popularity_rank: number;       // from analytics, for "trending"
  life_events: LifeEvent[];      // which life events this serves
  tags: string[];                // for search: synonyms, related terms
}

interface District {
  code: string;                  // e.g., "BANG_U" for Bengaluru Urban
  name_en: string;
  name_kn: string;
  taluks: Taluk[];
}

interface Taluk {
  code: string;
  name_en: string;
  name_kn: string;
  gram_panchayats: GramPanchayat[];
}
```

**Data Collection for Static Catalog:**
- Manually catalog all 450+ services from mahitikanaja.karnataka.gov.in
- Map each to department, sector, life events
- Build district → taluk → GP hierarchy (31 districts, ~176 taluks, ~6000+ GPs)
- Source: Census of India + Karnataka Revenue Department data

#### 1.3 Core Layout Components (Week 2–3)

Build the component library matching the existing mockup:
- `TopBar` — Government of Karnataka branding, language toggle, accessibility controls
- `Header` — Sticky header with search bar, nav links
- `Footer` — 4-column grid with links, badges
- `MobileNav` — Slide-out drawer for mobile (the mockup hides nav on mobile)
- `SearchAutocomplete` — Fuse.js-powered search across service catalog

#### 1.4 Three Navigation Pathways (Week 3–4)

**By Location:**
```
Homepage → "Browse by Location" card
  → District selector (31 cards or searchable dropdown)
    → Taluk selector
      → Gram Panchayat selector
        → All services available at that GP level
```
Implementation: Cascading `<Select>` components with data from `districts.json`. Filter services by `granularity` field.

**By Department:**
```
Homepage → "Browse by Department" card
  → Department grid (30+ departments with icons)
    → Department page: description + all services under it
```
Implementation: Static pages generated at build time via `generateStaticParams()`.

**By Life Event:**
```
Homepage → "Browse by Life Event" card
  → Life event cards: Birth, Education, Employment, Housing, Retirement, etc.
    → Relevant services with step-by-step guidance
```
Implementation: Curated mappings in `life-events.json`. Each event page is an editorial page with structured service links.

---

### Phase 2: Visual Design & Frontend Build (Weeks 3–8)

#### 2.1 Homepage Implementation (Week 3–4)
Directly translate the existing `index.html` mockup into React components:

| Mockup Section | Component | Data Source |
|---------------|-----------|-------------|
| Hero | `<Hero />` | Static copy + counters from `services.json` length |
| Quick Access Grid | `<QuickAccessGrid />` | Top 8 services by `popularity_rank` |
| Find Services By | `<Pathways />` | Static — 3 pathway cards |
| Public Spending Dashboard | `<DashboardPreview />` | Sample data initially, then live from DB |
| Government Schemes | `<SchemesSection />` | Curated list of top 6 schemes |

#### 2.2 Service Directory Page (Week 4–5)
- Grid/list toggle view of all 450+ services
- Filters: by sector (19), by department (30+), by category (4 types)
- Client-side search with Fuse.js
- Responsive: 4-col → 3-col → 2-col → 1-col
- Each card links to the service detail page or external portal

#### 2.3 Service Detail Pages (Week 5–6)
- For `is_external: false` services: embed the lookup form directly
  - Location cascade (District → Taluk → GP)
  - Data display in `<DataTable />` component
- For `is_external: true` services: show description + prominent link to external portal
  - Display which portal it redirects to
  - Show what inputs the user will need

#### 2.4 Accessibility & Performance (Week 6–7)
- WCAG 2.1 AA compliance audit
- Font size controls (A-/A+ buttons from mockup — persist in localStorage)
- High contrast mode (toggle from mockup)
- Screen reader testing with NVDA
- Lighthouse audit: target 95+ on all categories
- Implement `loading.tsx` skeletons for all data-fetching routes
- Image optimization via `next/image`
- Route prefetching for common navigation paths

#### 2.5 Mobile-First Refinement (Week 7–8)
- Touch-friendly tap targets (minimum 44px)
- Bottom navigation bar for mobile (Services, Dashboard, Search, More)
- Swipeable cards for Quick Access
- Collapsible sections for dense content
- PWA manifest + service worker for offline shell

---

### Phase 3: Data Transparency Dashboard (Weeks 5–10)

This is the **highest-impact phase** — the analysis identifies this as an "F Grade" on the current site.

#### 3.1 Database Setup (Week 5)

**Supabase Schema (Drizzle ORM):**

```typescript
// Fund allocations
export const fundAllocations = pgTable('fund_allocations', {
  id: serial('id').primaryKey(),
  district_code: varchar('district_code', { length: 10 }).notNull(),
  department_id: varchar('department_id', { length: 50 }).notNull(),
  scheme_name: varchar('scheme_name', { length: 200 }).notNull(),
  financial_year: varchar('financial_year', { length: 10 }).notNull(), // "2024-25"
  allocated_amount: decimal('allocated_amount', { precision: 15, scale: 2 }),
  released_amount: decimal('released_amount', { precision: 15, scale: 2 }),
  utilized_amount: decimal('utilized_amount', { precision: 15, scale: 2 }),
  beneficiary_count: integer('beneficiary_count'),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Infrastructure projects
export const infraProjects = pgTable('infra_projects', {
  id: serial('id').primaryKey(),
  district_code: varchar('district_code', { length: 10 }).notNull(),
  taluk_code: varchar('taluk_code', { length: 20 }),
  gp_code: varchar('gp_code', { length: 20 }),
  project_name: varchar('project_name', { length: 500 }).notNull(),
  department_id: varchar('department_id', { length: 50 }),
  status: varchar('status', { length: 20 }), // 'completed' | 'in_progress' | 'planned'
  sanctioned_amount: decimal('sanctioned_amount', { precision: 15, scale: 2 }),
  spent_amount: decimal('spent_amount', { precision: 15, scale: 2 }),
  start_date: date('start_date'),
  completion_date: date('completion_date'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Pension disbursements
export const pensionDisbursements = pgTable('pension_disbursements', {
  id: serial('id').primaryKey(),
  district_code: varchar('district_code', { length: 10 }).notNull(),
  taluk_code: varchar('taluk_code', { length: 20 }),
  scheme_type: varchar('scheme_type', { length: 100 }), // 'old_age', 'widow', 'disability'
  financial_year: varchar('financial_year', { length: 10 }),
  quarter: integer('quarter'), // 1-4
  beneficiary_count: integer('beneficiary_count'),
  total_amount: decimal('total_amount', { precision: 15, scale: 2 }),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Scholarship data
export const scholarships = pgTable('scholarships', {
  id: serial('id').primaryKey(),
  department: varchar('department', { length: 100 }), // 'backward_classes', 'social_welfare', 'tribal_welfare'
  scheme_name: varchar('scheme_name', { length: 200 }),
  district_code: varchar('district_code', { length: 10 }),
  financial_year: varchar('financial_year', { length: 10 }),
  applications_received: integer('applications_received'),
  applications_approved: integer('applications_approved'),
  amount_disbursed: decimal('amount_disbursed', { precision: 15, scale: 2 }),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

#### 3.2 ETL Pipeline (Week 5–6)

**Scraper Architecture:**
```typescript
// src/lib/scraper/base-scraper.ts
abstract class BaseScraper {
  abstract source: string;
  abstract frequency: 'daily' | 'weekly' | 'monthly';

  async run(): Promise<void> {
    const raw = await this.fetch();        // HTTP request or Playwright navigation
    const parsed = await this.parse(raw);  // Extract structured data
    const validated = this.validate(parsed); // Zod schema validation
    await this.upsert(validated);          // Drizzle upsert to Supabase
    await this.cache(validated);           // Cache summary in Upstash
  }

  abstract fetch(): Promise<string | Page>;
  abstract parse(raw: string | Page): Promise<unknown[]>;

  private validate(data: unknown[]): z.infer<typeof this.schema>[] {
    return data.map(d => this.schema.parse(d));
  }
}
```

**Target Data Sources:**
| Source URL Pattern | Data | Scraping Method | Frequency |
|-------------------|------|----------------|-----------|
| mahitikanaja.karnataka.gov.in/pension/* | Pension beneficiary status | Cheerio (HTML tables) | Daily |
| mahitikanaja.karnataka.gov.in/scholarship/* | Scholarship disbursement | Cheerio | Weekly |
| mahitikanaja.karnataka.gov.in/gpwise/* | GP-level infrastructure | Playwright (JS-rendered) | Weekly |
| rdpr.karnataka.gov.in | Rural development spending | Cheerio | Monthly |

**Rate Limiting & Politeness:**
- Maximum 1 request/second to any government domain
- Respect robots.txt
- Cache responses for 24 hours minimum
- Use `User-Agent: MahitiKanaja-Redesign/1.0 (research)`

#### 3.3 Dashboard Pages (Week 6–9)

**3.3.1 — Fund Allocation Dashboard (`/dashboard/spending`)**
- **Choropleth map**: Karnataka district map colored by total fund utilization percentage
  - Click a district → drill down to taluk-level view
  - Implementation: React-Leaflet + GeoJSON from Datameet
- **Bar chart**: Top 10 districts by allocation (horizontal, sortable by allocated/released/utilized)
  - Implementation: Recharts `<BarChart>` with animated entry
- **Year-over-year trend**: Line chart showing state total allocation trends across 5 financial years
- **Department breakdown**: Treemap showing proportional allocation by department
  - Implementation: Nivo `<Treemap>`
- **Filters**: Financial year selector, department filter, district filter

**3.3.2 — Scheme Beneficiary Tracker (`/dashboard/schemes`)**
- **Summary cards**: Total beneficiaries, total disbursed, approval rate
- **Donut chart**: Beneficiaries by scheme category (welfare, housing, education, food)
  - Matches the mockup's existing donut design
- **Data table**: Searchable, sortable table of all schemes with beneficiary counts
  - Columns: Scheme name, Department, Beneficiaries, Amount, Status
  - Export to CSV button
- **District comparison**: Side-by-side bar chart comparing any 2 districts

**3.3.3 — Infrastructure Project Tracker (`/dashboard/projects`)**
- **Map view**: All projects as pins on Karnataka map
  - Color-coded: green (completed), blue (in progress), grey (planned)
  - Click pin → project details popup
- **Status summary**: Three stat cards matching mockup (Completed, In Progress, Planned)
- **List view**: Toggle to table view with filters
- **Timeline**: Gantt-style view of project start/end dates per district

**3.3.4 — Pension Dashboard (`/dashboard/pensions`)**
- **Quarterly trend**: Line chart of disbursements over last 8 quarters
- **District heatmap**: Which districts have highest/lowest pension coverage
- **Scheme breakdown**: Old age vs. widow vs. disability pension distribution

#### 3.4 Open Data Portal (Week 9–10)

**`/open-data` page:**
- List of all available datasets with metadata (size, last updated, format)
- Download buttons: CSV, JSON, Excel
- API documentation (auto-generated from tRPC router)
- Usage examples in Python, R, JavaScript

**Public API (`/api/v1/`):**
```
GET /api/v1/services                    → Service catalog
GET /api/v1/spending?year=2024-25       → Fund allocations
GET /api/v1/spending?district=BANG_U    → District-specific spending
GET /api/v1/schemes?department=social_welfare → Scheme data
GET /api/v1/projects?status=in_progress → Infrastructure projects
GET /api/v1/pensions?district=MYSORE    → Pension data
```
- Rate limited: 100 requests/minute per IP
- JSON responses with pagination
- OpenAPI spec served at `/api/v1/openapi.json`

---

### Phase 4: Personalization & Engagement (Weeks 8–12)

#### 4.1 Smart Defaults (Week 8–9)
- Store district preference in localStorage (no account needed)
- On return visits, show "Your District: Bengaluru Urban" in header
- Dashboard defaults to user's district
- Service directory pre-filters to relevant granularity

#### 4.2 Scheme Eligibility Checker (Week 9–10)
**`/eligibility` page:**

Interactive questionnaire:
1. What is your occupation? (Farmer / Student / Government Employee / Other)
2. What is your annual family income?
3. What is your caste category? (General / OBC / SC / ST)
4. What is your age?
5. What district do you live in?

→ Output: List of schemes the user likely qualifies for, with:
- Scheme name and description
- How to apply (link to service page)
- Required documents
- Current application status (open/closed)

Implementation: Decision tree logic in a pure function. No backend needed — all eligibility rules encoded in a JSON rule set.

#### 4.3 PWA Features (Week 10–11)
```json
// public/manifest.json
{
  "name": "Mahiti Kanaja",
  "short_name": "ಮಾಹಿತಿ ಕಣಜ",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#C41E3A",
  "background_color": "#FAFAF8"
}
```
- Service worker: cache shell + last-viewed data pages
- Offline fallback page with cached service directory
- Add to Home Screen prompt after 2nd visit
- Push notifications (optional, via web-push) for scheme deadlines

#### 4.4 Feedback System (Week 11–12)
- Per-page "Was this helpful?" widget (thumbs up/down + optional comment)
- Store in Supabase `feedback` table
- Admin view to triage feedback (protected route)

---

### Phase 5: Quality, Governance & Launch (Weeks 10–14)

#### 5.1 Testing Strategy
| Type | Tool | Coverage Target |
|------|------|----------------|
| Unit | Vitest | Utility functions, data transformers, eligibility logic — 90%+ |
| Component | Vitest + React Testing Library | All interactive components — search, filters, forms |
| Integration | Vitest | API routes, database queries, scraper parsers |
| E2E | Playwright | 10 critical user flows (search → service, dashboard drill-down, eligibility checker) |
| Visual regression | Playwright screenshots | Homepage, dashboard, service pages across 3 viewports |
| Accessibility | axe-core + Playwright | Zero violations on all pages |
| Performance | Lighthouse CI | Score ≥ 95 on all categories |

#### 5.2 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

#### 5.3 Content Governance
- All text content must exist in both `en.json` and `kn.json`
- Service descriptions: maximum 2 sentences, plain language
- Data freshness badge on every dashboard card ("Last updated: 2 hours ago")
- Automated stale-data alerts: if any dataset is >7 days old, flag in monitoring

#### 5.4 Performance Budget
| Metric | Target | Enforcement |
|--------|--------|-------------|
| First Contentful Paint | < 1.2s | Lighthouse CI |
| Largest Contentful Paint | < 2.0s | Lighthouse CI |
| Total Blocking Time | < 200ms | Lighthouse CI |
| Cumulative Layout Shift | < 0.05 | Lighthouse CI |
| JS Bundle (initial) | < 150KB gzipped | `next/bundle-analyzer` |
| Total page weight | < 500KB | Vercel Analytics |

---

## Data Flow Diagrams

### Service Lookup Flow
```
User selects District → Taluk → GP
        │
        ▼
  Client sends request to tRPC endpoint
        │
        ▼
  Check Upstash cache (key: `services:{district}:{taluk}:{gp}`)
        │
   ┌────┴────┐
   │ HIT     │ MISS
   ▼         ▼
  Return   Query Supabase → Cache result → Return
```

### ETL Scraping Flow
```
GitHub Actions Cron (daily 2 AM IST)
        │
        ▼
  POST /api/cron/scrape-pensions (with CRON_SECRET header)
        │
        ▼
  PensionScraper.run()
    ├── Fetch mahitikanaja.karnataka.gov.in/pension/...
    ├── Parse HTML tables → structured data
    ├── Validate with Zod schema
    ├── Upsert to Supabase `pension_disbursements`
    ├── Invalidate Upstash cache keys
    └── Log results to `scrape_log` table
```

### Dashboard Rendering Flow
```
User visits /dashboard/spending
        │
        ▼
  React Server Component fetches data
    ├── Aggregated spending by district (Postgres GROUP BY)
    ├── GeoJSON boundaries (static import)
    └── Trend data (last 5 years)
        │
        ▼
  Server renders initial HTML with data
  Client hydrates interactive components
    ├── Recharts BarChart (client component)
    ├── React-Leaflet Map (client component, lazy-loaded)
    └── Filter controls (client component)
```

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Government site blocks scraping | Medium | High | Respect rate limits, use polite UA, cache aggressively. Fallback to manual data entry. Pursue official API access in parallel. |
| Government site structure changes | High | Medium | Scraper tests with fixture HTML. Alert on parse failures. Quick-fix turnaround. |
| Kannada font rendering issues | Medium | Low | Use Noto Sans Kannada as fallback. Test across browsers. |
| Data accuracy concerns | Medium | High | Always show "Source: mahitikanaja.karnataka.gov.in" with last-scraped timestamp. Link to original. |
| Supabase free tier limits | Low | Medium | Free tier = 500MB DB + 1GB storage. Sufficient for prototype. Upgrade path clear. |
| Legal concerns around scraping public data | Low | Medium | Data is published under RTI Section 4(2) — mandated to be public. We credit the source. |

---

## Milestone Summary

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Project bootstrap | Repo, CI, Vercel deploy, design tokens |
| 2 | Data modeling | Service catalog JSON, district hierarchy, DB schema |
| 3 | Core layout | Header, footer, mobile nav, search — all responsive |
| 4 | Navigation pathways | Location/Department/Life Event browse pages |
| 5 | Homepage complete | Full homepage matching mockup, live on Vercel |
| 6 | Service directory | Searchable/filterable service catalog page |
| 7 | ETL pipeline v1 | Pension + scholarship scrapers running on cron |
| 8 | Dashboard v1 | Spending + scheme dashboards with live data |
| 9 | Dashboard v2 | Infrastructure map + pension trends |
| 10 | Open Data portal | CSV downloads + public API |
| 11 | Eligibility checker | Interactive questionnaire |
| 12 | PWA + polish | Offline support, performance optimization |
| 13 | Testing & QA | Full test suite, accessibility audit |
| 14 | Launch | Production deployment, monitoring, documentation |
