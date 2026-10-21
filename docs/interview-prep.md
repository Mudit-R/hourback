# HourBack — Comprehensive Interview Preparation Guide (15 Questions & Answers)

This guide prepares you to defend every architectural decision, performance optimization, and trade-off in HourBack during technical rounds at Toddle.

---

### 1. Architecture & System Design

#### Q1: "Walk me through the high-level architecture of HourBack and why you designed it this way."
> **Answer**:  
> "HourBack is an asynchronous, teacher-in-the-loop copilot built with React 18, Apollo Server Express, and AWS SQS. When a teacher initiates bulk comment generation for 30 students, the GraphQL resolver does not make synchronous LLM calls. Doing so would risk 29-second gateway timeouts and web thread starvation. Instead, it creates a job entity and publishes 10-message batches to an SQS queue. A worker process consumes these messages, scrubs student PII, generates candidate drafts via an LLM provider abstraction, runs deterministic validation rules, re-hydrates student names in memory, and commits the comment and sentence-level citations atomically in PostgreSQL. The frontend polls job progress every 2.5s and provides a SplitPane editor where hovering a sentence highlights its cited classroom evidence."

#### Q2: "Why choose SQS and a worker process over handling generation in Node.js background worker threads or promises?"
> **Answer**:  
> "Background promises inside an Express process are volatile: if the container crashes, scales down, or restarts during deployment, pending generation requests are permanently lost without trace. SQS guarantees at-least-once message persistence, decouples ingestion throughput from generation concurrency, provides visibility timeouts for in-flight tasks, and automatically routes repeatedly failing records to a Dead Letter Queue (DLQ). It allows compute workers to scale independently from the API tier."

#### Q3: "How do you guarantee idempotency when SQS delivers a message more than once?"
> **Answer**:  
> "SQS standard queues guarantee at-least-once delivery, so duplicate deliveries can occur during visibility timeout expirations or network blips. Our worker implements a two-tier defense:  
> 1. A pre-inference check: `SELECT id FROM report_comments WHERE student_id=$1 AND period_id=$2`. If a row exists, the worker acknowledges the SQS message and exits immediately in <1 ms without incurring LLM cost or latency.  
> 2. A database-level unique constraint on `(student_id, period_id)`. In concurrent race conditions where two workers process identical messages simultaneously, the second INSERT throws a duplicate key violation. The worker catches this specific error and treats it as a benign race, acknowledging the message cleanly."

---

### 2. LLM Safety, Guardrails & Privacy

#### Q4: "How do you prevent hallucinations and ensure comments are 100% grounded in student data?"
> **Answer**:  
> "We enforce structural and relational groundedness. Structurally, the LLM prompt requires JSON output where every sentence object includes an array of `evidence_ids`. Post-generation, our deterministic TypeScript validator checks that every evidence ID in every sentence actually belongs to that student's evidence pack and that zero sentences lack citations. If a sentence claims an achievement without citing an observation or rubric criterion, the validator fails and triggers a single retry with explicit validator error feedback. If retry fails, the comment is stored with `status: flagged` for manual teacher drafting."

#### Q5: "How does HourBack ensure compliance with student privacy laws like FERPA or India's DPDP Act?"
> **Answer**:  
> "We enforce a zero-PII boundary before any payload leaves our worker process. Before calling the LLM provider, `tokenizeName` scans all evidence text and replaces the student's full name and preferred name with `STUDENT_1`. Even if foundation model providers store prompt logs for auditing, no student identity is ever exposed. Name re-hydration occurs strictly in memory after output validation, right before the database transaction commits."

#### Q6: "Why did you implement rule-based deterministic filtering for deficit language instead of using LLM-as-a-judge?"
> **Answer**:  
> "Calling an LLM judge to evaluate tone adds 1.5–2.5 seconds of latency per student and doubles inference costs. In K-12 reporting, forbidden deficit terms (*'lazy'*, *'weak'*, *'struggling'*, *'cannot'*) and peer comparisons (*'better than others'*) are well-defined patterns. Our pure TypeScript validator evaluates regex sets in under 0.1 milliseconds with 100% deterministic predictability and zero false-negative hallucinations."

---

### 3. Performance & GraphQL Optimization

#### Q7: "What is the N+1 problem in GraphQL, and how did you measure and eliminate it in HourBack?"
> **Answer**:  
> "In a naïve GraphQL resolver, querying a class roster of 30 students executes 1 query to fetch the students, and then for each student executes separate queries for assessment results, observations, and report comments. This results in `1 + (3 × 30) = 91` round trips to PostgreSQL. We implemented DataLoader instances scoped per request. DataLoader batches all 30 student IDs collected during a single tick of the event loop into single `WHERE IN (...)` queries, cutting total database round trips to exactly 4 queries—a measured 96% reduction in database load."

#### Q8: "How does the virtualized roster improve frontend rendering performance?"
> **Answer**:  
> "A standard class roster of 30–60 students mounts over 200–400 DOM nodes (avatars, text labels, status chips, event listeners). When the parent component re-renders or updates polling status, reconciling the full DOM tree causes layout thrashing. Using `react-virtualized`, we only render the ~6 visible rows in the viewport plus 2 overscan rows (56 elements total). Benchmarking with React Profiler showed a 75% reduction in reconciliation time, maintaining a smooth 60 FPS during fast scrolling."

#### Q9: "Why did you choose client-side polling over GraphQL subscriptions for job progress tracking?"
> **Answer**:  
> "GraphQL subscriptions over WebSockets require maintaining persistent TCP connections and sticky load-balancer sessions. When compute workers run in serverless Lambdas, broadcasting events back to WebSocket clients necessitates an additional Redis pub/sub broker layer. For a 30-student cohort where async processing completes in under a minute, polling `generationJob(jobId)` every 2.5–3 seconds delivers visible progress within one tick with zero infrastructure overhead. We kept the Subscription type in the GraphQL schema as a documented stub to reflect the scale trade-off."

---

### 4. Product Thinking & Teacher UX (Toddle Alignment)

#### Q10: "Toddle's core mission is saving teachers 10+ hours a week. How does HourBack's UX achieve that?"
> **Answer**:  
> "Saving time isn't just about generating text quickly; it's about minimizing the cognitive load required to verify that text. A generic AI generator gives teachers a block of text that they must read and cross-reference against gradebooks, taking 4–5 minutes per student. HourBack uses a SplitPane editor where hovering a sentence highlights the exact rubric criterion or teacher observation on the right pane. A teacher can verify groundedness in 3 seconds, adjust tone with one click, edit minor phrasing, and approve. Our stopwatch analytics show review times dropping from ~7.5 minutes to ~1.1 minutes per student."

#### Q11: "What did you discover during user testing sessions with teachers, and what changed as a result?"
> **Answer**:  
> "During user testing with K-12 teachers, two critical usability friction points emerged:  
> 1. Teachers found moving their hand from keyboard to mouse after approving each student slowed down their batch review flow. We implemented an automatic cursor advancement handler (`onNextStudent`) that immediately loads the next pending student upon approval.  
> 2. Teachers needed to know their character and word counts in real time because report cards have strict school formatting guidelines. We added real-time word, character, and Levenshtein edit distance counters directly below the textarea."

#### Q12: "How do you handle teachers who are hesitant to use AI for student evaluations?"
> **Answer**:  
> "We design for agency, transparency, and teacher control. HourBack never automatically sends or approves comments. The AI acts strictly as a copilot that synthesizes the teacher's own recorded observations and rubric grades into parent-ready language. The groundedness badge (e.g. '100% Grounded') and clickable citation tags provide proof of provenance, reassuring teachers that no fabricated claims exist."

---

### 5. Failure Modes, Edge Cases & Roadmap

#### Q13: "What happens if an external LLM provider like Gemini undergoes an outage or returns 500 errors?"
> **Answer**:  
> "The SQS visibility timeout ensures the message is not deleted. After the timeout expires, the message returns to the queue and is retried. SQS redrive policies specify `maxReceiveCount: 3`. If all 3 attempts fail due to provider downtime, the message moves to the Dead Letter Queue (`hourback-comments-dlq`), alerting on-call engineers via CloudWatch alarms without dropping student data or failing the whole cohort."

#### Q14: "What was the most challenging technical bug you encountered in this project, and how did you debug it?"
> **Answer**:  
> "During early monorepo builds, TypeScript threw `TS6059` errors because `rootDir: 'src'` in the API application prohibited importing shared TypeScript interfaces from `packages/shared/src`. Omitting the restrictive rootDir in sub-packages allowed clean cross-workspace compilation. Additionally, we found that naïve assessment loaders weren't joining rubric criteria descriptions, causing `criterion_name` to be undefined in GraphQL responses. We refactored `createAssessmentResultsLoader` to perform a single batch join on criteria, resolving both data integrity and query efficiency."

#### Q15: "If you had two more weeks to work on HourBack, what would you prioritize next?"
> **Answer**:  
> "I would implement two high-value features:  
> 1. Multilingual translation: Automatically translating approved English comments into Spanish, Hindi, or Mandarin for multilingual families while preserving educational terminology.  
> 2. Bi-directional LMS sync: Integrating LTI (Learning Tools Interoperability) or Google Classroom APIs to pull assignments and push finalized report comments directly into the school's student information system (SIS)."
