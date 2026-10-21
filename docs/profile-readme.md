# Hi, I'm Mudit Rungta
**Full-Stack Software Engineer & Final-Year B.Tech CS Student**  
India | [LinkedIn](https://linkedin.com) | [Portfolio](https://muditrungta.com) | [Email](mailto:mohit@example.com)

---

## Featured Project: HourBack (AI Progress Report Copilot for Teachers)
> *Engineered to save K-12 teachers 10+ hours a week by generating citation-grounded, deficit-free progress report comments directly from rubric assessments and classroom observations.*

### Key Architecture Highlights:
- **Zero-Hallucination Groundedness**: Every generated sentence is paired with specific evidence citations; deterministic validator rejects deficit language (*"lazy"*, *"weak"*) and peer comparisons with zero LLM judge overhead.
- **High-Throughput Async Pipeline**: Decoupled Express/Apollo GraphQL server from SQS worker running in Lambda/LocalStack, achieving **157.9 comments/sec** processing throughput.
- **Database Optimization**: Implemented DataLoaders across 3 core entities, slashing database queries from **91 to 4 queries per class roster (96% reduction)**.
- **FERPA/DPDP Privacy Boundary**: In-process PII tokenizer scrubs real student names to `STUDENT_1` before external LLM inference, rehydrating in-memory before PostgreSQL transaction commit.
- **SplitPane Teacher UX**: Built with React 18, Apollo Client, and CSS Modules; features bidirectional sentence-to-evidence hover highlighting, stopwatch review timer, and live Levenshtein edit distance tracking.

**Tech Stack**: TypeScript, React 18, Redux Toolkit, Apollo Client/Server, Express, PostgreSQL 16, Knex, Docker, AWS SQS, LocalStack, Jest, Playwright, Webpack 5.

**[Explore the Repository & Benchmarks →](https://github.com/muditrungta/hourback)**

---

## Technical Skills
- **Languages**: TypeScript, JavaScript (ES6+), Java, SQL, Python
- **Frontend**: React 18, Redux Toolkit, Apollo Client, Webpack 5, CSS Modules, Tailwind CSS, Jest, Playwright
- **Backend & Cloud**: Node.js, Express, Apollo Server (GraphQL), Spring Boot, PostgreSQL, Knex, Redis, Kafka, AWS (SQS, Lambda, CloudWatch), Docker
- **Practices & Systems**: Distributed Systems, RAG Safety Guardrails, DataLoaders / Query Optimization, PII Anonymization, CI/CD (GitHub Actions), Clean Architecture
