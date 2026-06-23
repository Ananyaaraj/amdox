<<<<<<< HEAD
# Amdox ERP — AI-Powered Cloud ERP Suite

> Enterprise AI-Powered Cloud ERP Suite | AMX-ERP-2026-04 | Version 1.0

[![CI/CD](https://github.com/your-org/amdox-erp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/amdox-erp/actions)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-22%20LTS-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)

---

## Overview

A scalable, AI-augmented, multi-tenant ERP platform delivering:

- **Finance** — GL, AP/AR automation, multi-currency, period close
- **HR & Payroll** — employee lifecycle, attendance, payroll engine
- **Supply Chain** — PO lifecycle, inventory, vendor portal, demand forecasting
- **Projects** — Gantt, resource allocation, budget tracking
- **BI Dashboard** — drag-and-drop dashboards, scheduled reports
- **AI Forecasting** — Prophet + LSTM demand prediction
- **Audit & Compliance** — immutable logs, GDPR DSR, SOC 2 alignment

**Target SLA:** 99.9% uptime | <300ms P95 API latency | SOC 2 Type II | GDPR/ISO 27001

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 + React 19 (TypeScript)                     │
│  Zustand + TanStack Query + Recharts + Tailwind CSS      │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / GraphQL / SSE
┌──────────────────────▼──────────────────────────────────┐
│  NestJS 11 API (Node.js 22 LTS, TypeScript)             │
│  JWT Auth · RBAC · Multi-tenant · BullMQ · Socket.io    │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼─────┐  ┌────▼────────┐
  │PostgreSQL│   │  Redis 8  │  │Elasticsearch│
  │17+Timesc.│   │  BullMQ   │  │   8.15      │
  └──────────┘   └───────────┘  └─────────────┘
                       │
          ┌────────────▼────────────┐
          │  Python FastAPI ML Svc  │
          │  Prophet + LSTM + MLflow│
          └─────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript 5.5, Tailwind CSS 3, Recharts |
| State | Zustand 5, TanStack Query v5 |
| Backend | NestJS 11, Node.js 22 LTS, TypeScript |
| API | REST (OpenAPI 3.1) + GraphQL (Apollo v4) |
| Database | PostgreSQL 17 + TimescaleDB, Prisma ORM |
| Cache | Redis 8, BullMQ |
| ML | Python 3.13, FastAPI, Prophet, PyTorch, MLflow |
| Search | Elasticsearch 8.15 |
| Auth | Keycloak 25, JWT (RS256), OIDC/SAML |
| DevOps | Docker, Kubernetes 1.31, Helm, ArgoCD, Terraform |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki |

---

## Prerequisites

- **Node.js** 22 LTS — [nodejs.org](https://nodejs.org)
- **pnpm** 9 — `npm i -g pnpm`
- **Docker Desktop** — [docker.com](https://docker.com)
- **Python** 3.11+ (for ML service)

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-org/amdox-erp.git
cd amdox-erp
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values (defaults work for local dev)
```

### 3. Start Infrastructure (Docker)

```bash
docker-compose up -d
# Starts: PostgreSQL, Redis, Keycloak, Elasticsearch, MinIO, Mailhog
```

Wait ~30 seconds for services to be healthy, then check:
```bash
docker-compose ps
```

### 4. Database Setup

```bash
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed demo data
```

### 5. Start All Services

```bash
# Start API + Web together
pnpm dev

# Or individually:
pnpm --filter @amdox/api dev      # API on :3001
pnpm --filter @amdox/web dev      # Web on :3000

# ML Service (optional — needs Python deps)
cd apps/ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py                     # ML on :8000
```

### 6. Open the App

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:3000 |
| **API Swagger** | http://localhost:3001/api-docs |
| **GraphQL Playground** | http://localhost:3001/graphql |
| **ML Service** | http://localhost:8000/docs |
| **Keycloak Admin** | http://localhost:8080 (admin/admin_secret) |
| **MinIO Console** | http://localhost:9001 (minio_admin/minio_secret) |
| **Mailhog** | http://localhost:8025 |
| **Prisma Studio** | `pnpm db:studio` → http://localhost:5555 |

**Demo credentials:** `admin@amdox.com` / `password`

---

## Project Structure

```
amdox-erp/
├── apps/
│   ├── web/                   # Next.js 15 frontend
│   │   └── src/
│   │       ├── app/           # App Router pages
│   │       │   ├── dashboard/ # Executive dashboard
│   │       │   ├── finance/   # GL, AP/AR, reports
│   │       │   ├── hr/        # Employees, payroll
│   │       │   ├── supply-chain/ # Inventory, POs
│   │       │   ├── projects/  # Gantt, tasks
│   │       │   ├── reports/   # BI dashboards
│   │       │   └── audit/     # Audit log viewer
│   │       ├── components/    # Reusable UI
│   │       ├── lib/           # API client, utils
│   │       └── store/         # Zustand stores
│   │
│   ├── api/                   # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/      # JWT, OIDC, RBAC
│   │       │   ├── finance/   # GL, invoices, FX
│   │       │   ├── hr/        # Employees, payroll
│   │       │   ├── supply-chain/ # Vendors, inventory
│   │       │   ├── projects/  # Tasks, milestones
│   │       │   ├── bi/        # Dashboards, KPIs
│   │       │   ├── notifications/ # Events, SSE
│   │       │   └── audit/     # Immutable logs
│   │       └── common/        # Guards, filters, pipes
│   │
│   └── ml-service/            # Python FastAPI ML
│       ├── main.py            # Prophet + LSTM forecasting
│       └── requirements.txt
│
├── packages/
│   ├── db/                    # Prisma schema + seed
│   └── shared/                # Shared TypeScript types
│
├── infra/
│   ├── terraform/             # AWS EKS, RDS, Redis, S3
│   └── k8s/helm/              # Helm chart values
│
├── docker/                    # Docker init scripts
├── docker-compose.yml         # Local dev stack
├── .github/workflows/ci.yml   # GitHub Actions CI/CD
└── turbo.json                 # Turborepo pipeline
```

---

## Available Scripts

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run DB migrations
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
```

---

## API Documentation

Once running, visit **http://localhost:3001/api-docs** for the full OpenAPI 3.1 spec.

Key endpoint groups:
- `POST /api/v1/auth/login` — authenticate
- `GET  /api/v1/finance/accounts` — chart of accounts
- `GET  /api/v1/hr/employees` — employee list
- `GET  /api/v1/supply-chain/inventory` — inventory status
- `GET  /api/v1/bi/kpis` — executive KPIs
- `GET  /api/v1/audit/logs` — immutable audit trail

---

## Key Features

### Multi-Tenancy
- Row-level tenant isolation via Prisma middleware
- JWT carries `tenantId` — every query is tenant-scoped
- Keycloak realm-per-tenant strategy (SSO/SAML)

### AI Demand Forecasting
- Prophet model for SKU-level time-series (MAPE < 12% target)
- LSTM as secondary model for high-volume SKUs
- Weekly retraining via BullMQ cron
- REST API at `http://localhost:8000`

### Security
- OWASP Top 10 mitigations (Helmet, CSRF, input validation)
- TLS 1.3 in transit, AES-256 at rest
- Rate limiting: Redis sliding window
- Audit log: hash-chain tamper detection (SHA-256)

### Payroll Engine
- Gross-to-net with configurable tax slabs
- BullMQ async processing — handles 10K employees in <5 min
- Compensation saga with retry/rollback

---

## Deployment

### Docker Compose (Staging)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes (Production)
```bash
# Install with Helm
helm install amdox ./infra/k8s/helm -f infra/k8s/helm/values.yaml \
  --set api.image.tag=<SHA> \
  --set web.image.tag=<SHA>

# GitOps via ArgoCD
kubectl apply -f infra/k8s/argocd-app.yaml
```

### AWS Infrastructure
```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=<YOUR_PASSWORD>"
terraform apply
```

---

## Evaluation Criteria (AMX-ERP-2026-04)

| Category | Weight | Coverage |
|----------|--------|---------|
| Innovation & Problem Solving | 15% | AI forecasting, multi-tenant SSO |
| Technical Depth & Best Practices | 25% | DDD, CQRS, Outbox, Saga, OWASP |
| Functionality & User Experience | 20% | F-01 to F-12 modules |
| Documentation Quality | 20% | This README + OpenAPI + ADRs |
| Deployment & Reliability | 10% | Docker, K8s, Terraform, CI/CD |
| Presentation & Polish | 10% | Responsive UI, dark mode |

---

## Submission

File naming: `YourName_AMX_ERP_AmdoxTechnologies_April2026.pdf / .zip`

Deliverables:
1. ✅ Project Report PDF
2. ⬜ Live Public Demo URL
3. ✅ GitHub Repository (this repo)
4. ✅ README.md
5. ⬜ Demo Video (5–7 min, Loom/YouTube Unlisted)

---

## License

MIT © 2026 Amdox Technologies
=======
# Amdox-intern
>>>>>>> 0bc63e7825efe1ad9f32347900b1cb5c07bba17b
