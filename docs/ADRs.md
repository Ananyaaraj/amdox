# Architecture Decision Records (ADRs)

## ADR-001: Monorepo with Turborepo + pnpm
**Status:** Accepted  
**Decision:** Use Turborepo monorepo with pnpm workspaces for all packages.  
**Rationale:** Shared Prisma types, unified CI/CD pipeline, atomic commits across frontend/backend.

---

## ADR-002: NestJS Modular Monolith over Microservices
**Status:** Accepted  
**Decision:** Start with NestJS modular monolith; migrate to microservices as scale demands.  
**Rationale:** Reduces operational complexity at MVP stage. Domain boundaries are pre-defined via DDD bounded contexts, making future extraction straightforward.

---

## ADR-003: PostgreSQL over MongoDB
**Status:** Accepted  
**Decision:** PostgreSQL 17 + TimescaleDB for all persistence.  
**Rationale:** ERP requires ACID compliance for double-entry accounting. TimescaleDB extension handles time-series audit logs and telemetry.

---

## ADR-004: BullMQ over Kafka for Job Queue
**Status:** Accepted  
**Decision:** BullMQ (Redis-backed) for background jobs at MVP stage.  
**Rationale:** Simpler operational model. Kafka noted as future migration path when throughput exceeds Redis capacity.

---

## ADR-005: Keycloak for Identity
**Status:** Accepted  
**Decision:** Self-hosted Keycloak 25 for OIDC/SAML SSO.  
**Rationale:** On-premise flexibility, realm-per-tenant model, avoids vendor lock-in (Auth0 evaluated and rejected).

---

## ADR-006: Prophet + LSTM for Demand Forecasting
**Status:** Accepted  
**Decision:** Prophet as primary model; PyTorch LSTM for high-volume SKUs.  
**Rationale:** Prophet handles seasonality/trend with minimal data; LSTM captures complex non-linear patterns for large SKU datasets.

---

## ADR-007: Multi-Tenant Row-Level Security via Prisma Middleware
**Status:** Accepted  
**Decision:** Inject `tenantId` filter at Prisma middleware layer rather than application layer.  
**Rationale:** Centralised enforcement prevents accidental cross-tenant data leakage across all modules.
