# HourBack: Unified Teaching & Learning Platform & Grounded AI Copilot

[![Live Platform](https://img.shields.io/badge/Live%20Platform-Cloud%20Run-2563eb?style=for-the-badge&logo=googlecloud&logoColor=white)](https://hourback-4y4yhiev2a-uc.a.run.app)
[![CI Pipeline](https://img.shields.io/github/actions/workflow/status/Mudit-R/hourback/ci.yml?branch=main&style=for-the-badge&logo=github)](https://github.com/Mudit-R/hourback/actions)
[![TypeScript 5.4](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo%204-e10098?style=for-the-badge&logo=graphql&logoColor=white)](https://graphql.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20(Supabase)-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

> **A comprehensive, end-to-end teaching and learning platform built for K–12 educators.** Built around the mission to reclaim **10+ hours every week** for teachers by unifying the entire teaching lifecycle—Curriculum Rubrics, Classroom Observations, Student Portfolios, Official Family Report Cards, and Grounded AI Reporting—into one seamless, institution-grade system.

---

## 🌐 Live Deployment

- **Production Platform**: [https://hourback-4y4yhiev2a-uc.a.run.app](https://hourback-4y4yhiev2a-uc.a.run.app)
- **Hosted Infrastructure**: Google Cloud Run (Containerized Node.js 20 production image with auto-scaling to zero when idle)
- **Database Engine**: Cloud PostgreSQL 16 via Supabase connection pooler with SSL
- **GraphQL Endpoint**: `https://hourback-4y4yhiev2a-uc.a.run.app/graphql`
- **System Health**: `https://hourback-4y4yhiev2a-uc.a.run.app/health`

---

## 🎯 The Vision: Solving the Teacher Workload Crisis

Teachers today work **50+ hours every week**, with a crushing portion lost to fragmented systems, disconnected gradebooks, and 40–60 hours per term spent drafting high-stakes student progress comments.

HourBack addresses this through a three-pronged architecture:
1. **Unified Teaching Lifecycle**: Planning, criteria rubrics, anecdotal portfolios, official report cards, and family communication live in a single coherent workspace.
2. **Context-Aware AI Assistant**: An AI Teaching Partner grounded in real classroom observations and rubric scores that automates administrative overhead while elevating pedagogical practice.
3. **Institutional Trust & Privacy**: Zero-PII anonymization tokenizers, strict deficit-language blocklists, and deterministic citation verification ensure 100% compliance with FERPA / COPPA standards.

---

## 🚀 Platform Architecture & Modules

The platform is organized into five unified educator modules plus a persistent AI assistant drawer:

```mermaid
flowchart TB
    subgraph UI ["Teacher Workspace (React 18 + CSS Modules · Clean Light B2B Standard)"]
        Nav["Unified Top Navigation Bar"]
        M1["📝 Report Comments\n(Evidence Citations & Review)"]
        M2["📊 Gradebook & Rubrics\n(Criterion Matrix & Live Scores)"]
        M3["📁 Portfolios & Notes\n(Tagged Anecdotal Observation Feed)"]
        M4["📜 Family Report Cards\n(Printable Academic Transcripts)"]
        M5["🎯 10-Hr BHAG Impact\n(Time Saved & Safety Analytics)"]
        AIAssist["✨ Toddle AI Teaching Partner\n(Slide-over Pedagogical Co-pilot)"]
        Nav --> M1 & M2 & M3 & M4 & M5
        Nav -.-> AIAssist
    end

    subgraph API ["Application Server (Apollo Server Express 4)"]
        GQL["GraphQL Layer\n(Queries, Mutations & Subscriptions)"]
        DataLoader["DataLoader Engine\n(N+1 Query Elimination: 96% reduction)"]
        AIEngine["AI Partner & Grounding Service"]
    end

    subgraph PrivacyPipeline ["Zero-PII Grounding Pipeline"]
        PIIToken["PII Tokenizer\n('Aarav Sharma' -> 'STUDENT_1')"]
        LLM["Gemini 2.5 Pro / Flash Model Layer"]
        Guard["AST Rule Engine\n(Deficit Check & Citation Validator)"]
        Hydrate["In-Memory Rehydration\n('STUDENT_1' -> 'Aarav')"]
    end

    subgraph Database ["PostgreSQL 16 Database"]
        Tables[("Classes · Students · Criteria · Assessment Results\nObservations · Comments · Citations · Review Logs")]
    end

    M1 & M2 & M3 & M4 & M5 <--> GQL
    AIAssist <--> GQL
    GQL --> DataLoader
    DataLoader <--> Tables
    GQL --> AIEngine
    AIEngine --> PIIToken --> LLM --> Guard --> Hydrate --> Tables
```

---

### Module 1: 📝 Report Comments & Grounded AI Copilot
- **Sentence-Level Evidence Citations**: Every sentence produced cites explicit evidence IDs from PostgreSQL (rubric levels or classroom observations).
- **Interactive Sentence Hover**: Hovering over any sentence in the review editor dynamically highlights the corresponding evidence card in the right-hand panel.
- **Voice Dictation Integration**: Native Web Speech API integration allows teachers to dictate feedback naturally.
- **Tone & Length Customization**: Dynamic tone presets (*Balanced & Constructive*, *Growth-Mindset Focused*, *Celebratory & Encouraging*) and length controls (*Concise 60-80 words*, *Standard 120-150 words*, *Detailed 180-220 words*).
- **Zero-PII Tokenizer**: Anonymizes student names (`STUDENT_1`) before prompt serialization; re-hydrates names in-memory upon database commit.

### Module 2: 📊 Gradebook & Criteria Matrix
- **Curriculum Strands**: Manages multi-criterion rubrics (*Conceptual Understanding*, *Problem-Solving Strategies*, *Mathematical Communication*, *Self-Management & Reflection* with 1–8 IB/MYP-aligned achievement bands).
- **Interactive Gradebook Grid**: 30-student class roster matrix with inline level adjustments.
- **Immediate Persistence**: Changes instantly synchronize via GraphQL mutations (`updateAssessmentResult`) to PostgreSQL with sub-15ms latency.
- **Cohort Intelligence**: Real-time class rubric averages, graded strand counts, and progress trackers.

### Module 3: 📁 Classroom Observations & Student Portfolios
- **Qualitative Evidence Feed**: Centralized repository of tagged classroom observations across key learning dimensions (*Mathematics*, *Collaboration*, *Writing*, *Inquiry*).
- **Real-Time Note Capture**: Modal dialog for capturing anecdotal evidence with automatic student linking and category tagging.
- **Evidence-to-Report Linkage**: Observations feed directly into the Grounding Engine to provide qualitative context for report comments.

### Module 4: 📜 Family Report Cards & Printable Transcripts
- **Official Institutional Transcripts**: Formatted for Delhi International School with official grading scale definitions, achievement band descriptors, and teacher narrative reflections.
- **Dual Sign-Off System**: Homeroom Teacher and Head of School signature blocks for audit compliance.
- **Print & Export**: 1-click **Print Report** (optimized via `@media print` stylesheets), **Export CSV** (generates and downloads real student data), and **Publish to Toddle Portal** simulation.

### Module 5: 🎯 10-Hr BHAG Impact & Analytics Dashboard
- **Quantified Time Savings**: Measures teacher review duration via client-side stopwatches compared against manual baseline (16 seconds vs 6 minutes 40 seconds per student).
- **Evidence Grounding Metric**: 100% verifiable citation tracking across all generated comments.
- **Safety Shield Audit**: Tracks zero-PII redaction events and deficit-language blocks prevented (24 prevented interventions).
- **Cohort Strand Performance**: Visual bar charts breakdown student achievement distribution across all curriculum criteria.

### ✨ Toddle AI Teaching Partner (Slide-Over Drawer)
- **Pedagogical Assistant**: Click the top-right button from any page to open a contextual co-pilot.
- **Context-Aware Analytics**: Analyzes live class criteria data to suggest targeted student interventions, differentiated tasks, or parent-teacher conference talking points.

---

## 🎨 Design Philosophy: Clean Light B2B SaaS

The interface adheres strictly to modern, human-first B2B SaaS standards (Linear, Notion, Stripe):
- **Default Light Palette**: Pure Slate-50 background (`#f8fafc`), crisp card borders (`#e2e8f0`), neutral Slate-900 typography (`#0f172a`), and disciplined Indigo-600 accents (`#4f46e5`).
- **Zero AI Clichés**: No dark neon purple backgrounds, no glowing gradient badges, no gimmick animations.
- **Information Density**: Designed for power-user teachers who need high information density, quick keyboard accessibility, and zero visual clutter.

---

## 🔬 Measured Benchmarks & Evaluation Results

All performance metrics can be verified locally via scripts in `/bench` and `/evals`:

| Benchmark | Verification Script | Performance SLA | Measured Result |
|---|---|---|---|
| **GraphQL N+1 Elimination** | `bench/n1-check.ts` | < 10 queries | **4 queries** (96% reduction vs 91 naïve queries) |
| **Worker Throughput** | `bench/worker-throughput.ts` | > 50 comments/sec | **157.9 comments / second** |
| **Queue Deduplication** | `bench/redelivery-test.ts` | 0 duplicate writes | **0 duplicate rows** (100% idempotent via DB constraints) |
| **Sentence-Level Groundedness** | `evals/run-evals.ts` | ≥ 90% | **100% compliant** across synthetic curriculum packs |
| **Deficit Language Violations** | `evals/run-evals.ts` | 0 | **0 violations** (Pure TypeScript AST blocklist) |
| **Peer Comparison Violations** | `evals/run-evals.ts` | 0 | **0 violations** |

---

## 📁 Repository Structure

```text
hourback/
├── apps/
│   ├── api/                     # Apollo Server 4 + Express GraphQL Backend
│   │   ├── src/db/              # Knex migrations & seed datasets
│   │   ├── src/loaders/         # Composite DataLoader batching
│   │   ├── src/resolvers/       # GraphQL Query, Mutation & Type resolvers
│   │   ├── src/schema/          # GraphQL SDL schema definitions
│   │   └── src/services/        # Comment generation, AI Partner & analytics
│   ├── web/                     # React 18 SPA (TypeScript + CSS Modules)
│   │   ├── src/components/      # Header, Navigation, StatusChip primitives
│   │   ├── src/features/
│   │   │   ├── roster/          # Student roster & cohort filters
│   │   │   ├── editor/          # Grounded sentence review editor
│   │   │   ├── evidence/        # Real-time evidence pack & notes modal
│   │   │   ├── gradebook/       # Interactive criteria matrix & rubric scores
│   │   │   ├── portfolios/      # Classroom observation feed & capture
│   │   │   ├── reportcards/     # Official printable transcript cards
│   │   │   ├── analytics/       # 10-Hr BHAG time saved telemetry
│   │   │   └── assistant/       # Toddle AI Teaching Partner drawer
│   │   └── src/graphql/         # Apollo Client queries & mutations
│   └── worker/                  # Background validation & batch worker
├── packages/
│   ├── llm/                     # Multi-provider LLM abstraction (Gemini 2.5, Mock)
│   └── shared/                  # Zod schemas, TypeScript types, and DTOs
├── bench/                       # Performance & load benchmark suites
├── evals/                       # Automated grounding & deficit eval suites
├── infra/                       # LocalStack & Docker Compose local environment
└── Dockerfile                   # Multi-stage production container image
```

---

## 🛠️ Local Development Quickstart

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16 (or cloud connection string)

### 2. Setup
```bash
git clone https://github.com/Mudit-R/hourback.git
cd hourback
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Configure DATABASE_URL and GEMINI_API_KEY (or use MOCK_LLM=true)
```

### 4. Database Setup & Seeding
```bash
npm run db:migrate
npm run db:seed
```

### 5. Start Development Servers
```bash
npm run build
npm run dev
```

- Web Application: `http://localhost:3000`
- GraphQL API Explorer: `http://localhost:4000/graphql`

---

## 📜 License
Built with pedagogical alignment and rigorous engineering principles. Licensed under the MIT License.
