# Amdox ERP — Complete Run Guide

## Prerequisites
- Node.js >= 22
- pnpm >= 9  (`npm i -g pnpm`)
- Docker Desktop (running)

---

## Step 1 — Enter the project root
```bash
cd amdox-erp
```

## Step 2 — Install all dependencies
```bash
pnpm install
```

## Step 3 — Install report-generation packages
```bash
cd apps/api
pnpm add pdfkit @types/pdfkit exceljs
cd ../..
```

## Step 4 — Start Docker services (Postgres + Redis + others)
```bash
docker compose up -d
```
Wait ~15 seconds, then verify:
```bash
docker compose ps
```
Postgres and Redis should show as **healthy**.

## Step 5 — Run Prisma migration + generate client
```bash
cd packages/db
npx prisma migrate dev --name add-user-password
npx prisma generate
cd ../..
```

## Step 6 — Seed the database (creates admin user with password)
```bash
cd packages/db
pnpm db:seed
cd ../..
```
This creates:
- **User:** admin@amdox.com / **admin123**
- Demo tenant, employees, products, projects, chart of accounts

## Step 7 — Start the backend API  (Terminal 1)
```bash
cd apps/api
pnpm dev
```
→ API: http://localhost:3001  
→ Swagger: http://localhost:3001/api-docs

## Step 8 — Start the frontend  (Terminal 2)
```bash
cd apps/web
pnpm dev
```
→ App: http://localhost:3000

## Step 9 — Log in
Open http://localhost:3000/auth/login  
Email: **admin@amdox.com**  
Password: **admin123**

The fields are pre-filled — just click **Sign in**.

---

## Reports feature
After login go to **BI & Reports** in the sidebar.  
Each of the 4 module cards (Finance, HR, Inventory, Projects) has a **PDF** and **Excel** button.

---

## Bug fixes in this build
1. Seed created admin user with NO password → login silently failed; fixed to hash `admin123`
2. Login page default password was `"password"` (wrong) → fixed to `"admin123"`
3. Auth store read tokens from wrong response path → fixed (`data.data.accessToken`)
4. Redis URL not parsed correctly → fixed in app.module.ts
5. Password never stored/verified in auth service → fixed with bcrypt
6. LocalStrategy ignored the password field → fixed
