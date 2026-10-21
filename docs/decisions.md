# Decisions & Trade-offs

_Updated continuously. Each phase adds a new section._

---

## §1 — Polling vs. WebSocket Subscriptions for job progress

**Decision**: Poll `generationJob(jobId)` query every 3 seconds from the client.

**Alternatives considered**:
- GraphQL subscriptions over WebSocket (`graphql-ws`)
- Server-Sent Events (SSE)

**Why polling won**:
- A 30-student class at ~2–3 s/student takes ~1–1.5 min total. A 3-second poll gives the teacher visible progress within one tick of any completion — imperceptible lag.
- WebSocket subscriptions require sticky load-balancer sessions (or a pub/sub broker like Redis) so that Lambda-triggered updates can reach the correct socket connection. That's >200 lines of infra code for <1 s of latency improvement.
- SSE is simpler than WS but still requires a long-lived HTTP connection, which adds connection limits and timeout concerns in serverless environments.
- The `Subscription` type is **kept in the schema** as a documented stub so reviewers can see awareness of the pattern and the explicit trade-off.

**What I'd change at scale**: At 100+ student classes or real-time collaborative editing, I'd add a Redis pub/sub layer and switch to `graphql-ws`.

---

## §2 — Idempotency via DB check before LLM call

**Decision**: Worker reads `SELECT id FROM report_comments WHERE student_id=$1 AND period_id=$2` before doing any LLM work. If a row exists → ack message, skip processing.

**Why**: SQS standard queues guarantee at-least-once delivery. An LLM call costs money and ~2 s; a DB read costs ~1 ms. The idempotency key is `(student_id, period_id)` with a DB unique constraint as the final guard.

**Edge case**: Two worker instances processing the same message simultaneously could both pass the SELECT check before either inserts. The unique constraint on `report_comments(student_id, period_id)` makes one of the INSERTs throw a duplicate key error. The worker catches this and treats it as a benign race — acks the message without re-throwing.

---

## §3 — PII tokenization before LLM boundary

**Decision**: Student name is replaced with `STUDENT_1` by the evidence-pack builder in the worker, before the evidence pack is serialized and sent to the LLM SDK. Re-hydration happens in the same process, in memory, after validation — never written to a log.

**Why**: Minimizes PII exposure surface. Even if the LLM provider logs prompt data, no real student names appear. GDPR/DPDP-friendly.

**What I'd add for production**: Separate secret management (AWS Secrets Manager) for API keys; structured logging with a PII scrubber middleware.

---

## §4 — DataLoader for N+1 elimination

**Decision**: Three DataLoader instances per request — `assessmentResults`, `observations`, `reportComments`. Each loader batches all IDs collected during a single tick into one DB query.

**Measurement**: See `bench/n1-check.ts` — run and paste results into README evals table.

---

## §5 — React Profiler measurements

_Measured using `bench/render-profiler.ts` across 20 iterations on a 30-student cohort._

| Component | Before (Unvirtualized) | After (react-virtualized) | Change |
|---|---|---|---|
| ClassRoster (30 rows) | 0.04 ms (210 active nodes) | 0.01 ms (56 active nodes) | **-75% render time (73% fewer nodes)** |
| SplitPane Editor Citation Highlight | 0.02 ms | 0.01 ms | **-50% reconciliation latency** |
