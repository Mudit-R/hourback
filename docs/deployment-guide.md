# HourBack — Free-Tier Live Deployment Guide

This guide describes how to deploy a live, publicly accessible instance of HourBack with seeded data on zero-cost free-tier infrastructure.

---

## Architecture for Free-Tier Deployment

| Component | Platform | Free-Tier Specs |
|---|---|---|
| **Database** | [Neon](https://neon.tech) / [Supabase](https://supabase.com) | Free Serverless PostgreSQL 16 (0.5 GiB storage) |
| **API Backend** | [Render](https://render.com) Web Service | Free Web Service (512 MB RAM, spins down on idle) |
| **Frontend SPA** | [Vercel](https://vercel.com) / [Render](https://render.com) Static | Free global edge CDN hosting |
| **LLM Provider** | MockProvider or Google Gemini 1.5 Flash | Free Gemini API tier (15 RPM / 1M TPM free) |

---

## Step 1: Provision Free Serverless PostgreSQL on Neon
1. Create a free project at [neon.tech](https://neon.tech).
2. Create database named `hourback`.
3. Copy the pooled connection string:
   ```text
   postgresql://user:password@ep-cool-cloud.us-east-2.aws.neon.tech/hourback?sslmode=require
   ```

---

## Step 2: Run Migrations and Seeds to Neon
Run Knex migrations and seeds directly from your local environment against the cloud database:
```bash
DATABASE_URL="postgresql://user:password@ep-cool-cloud.us-east-2.aws.neon.tech/hourback?sslmode=require" npm run db:migrate
DATABASE_URL="postgresql://user:password@ep-cool-cloud.us-east-2.aws.neon.tech/hourback?sslmode=require" npm run db:seed
```

---

## Step 3: Deploy the API to Render
1. Create a **Web Service** on Render pointing to your GitHub repository.
2. Configure settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `cd ../.. && npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/llm && npm run build --workspace=apps/api`
   - **Start Command**: `node dist/index.js`
3. Add Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `PORT`: `10000`
   - `NODE_ENV`: `production`
   - `LLM_PROVIDER`: `mock` (or `gemini` with `GEMINI_API_KEY`)
   - `CORS_ORIGIN`: Your frontend URL (e.g., `https://hourback.vercel.app`)

---

## Step 4: Deploy the Frontend to Vercel
1. Import repository into Vercel.
2. Configure settings:
   - **Framework Preset**: Other / None
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/web`
   - **Output Directory**: `dist`
3. Environment Variables:
   - `REACT_APP_GRAPHQL_URL`: `https://your-render-service.onrender.com/graphql`
4. Click **Deploy**.

Your live demo will now be available with 2 pre-seeded classes and 60 realistic students ready for interactive review!
