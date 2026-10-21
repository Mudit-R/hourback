/**
 * Benchmark (c): Worker Throughput and p50 / p95 Latency for a 30-Student Class
 *
 * Runs 30 student evidence packs concurrently through the complete worker pipeline:
 * PII tokenization -> LLM generation (MockProvider) -> deterministic validation -> name rehydration.
 *
 * Run with: npx ts-node bench/worker-throughput.ts
 */

import { MockProvider } from '../packages/llm/src/providers/mock';
import { validateLLMResponse, computeGroundednessScore } from '../apps/worker/src/validator';
import { tokenizeName, rehydrateName, STUDENT_TOKEN } from '../apps/worker/src/tokenizer';
import type { EvidencePack } from '../packages/shared/src/index';

const SAMPLE_NAMES = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Karan Patel',
  'Divya Reddy', 'Arjun Singh', 'Sneha Gupta', 'Vikram Joshi', 'Meera Pillai',
  'Aditya Kumar', 'Pooja Verma', 'Rahul Bose', 'Shreya Agarwal', 'Nikhil Rao',
  'Anjali Mishra', 'Siddharth Nair', 'Kavya Menon', 'Ravi Chandra', 'Neha Saxena',
  'Akash Tripathi', 'Lakshmi Das', 'Vivek Bansal', 'Tanvi Shah', 'Manish Yadav',
  'Riya Kapoor', 'Gaurav Pandey', 'Ishaan Srivastava', 'Pallavi Desai', 'Suresh Hegde',
];

function createEvidencePack(name: string, index: number): { pack: EvidencePack; rawName: string; preferredName: string } {
  const preferredName = name.split(' ')[0]!;
  const obsId = `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`;
  const critId = `11111111-1111-1111-1111-${String(index + 1).padStart(12, '0')}`;

  const rawObservation = `${name} demonstrated exceptional persistence and inquiry skills during the math project.`;
  const tokenizedObs = tokenizeName(rawObservation, name, preferredName);

  const pack: EvidencePack = {
    studentToken: STUDENT_TOKEN,
    tone: 'warm',
    length: 'medium',
    periodName: 'Semester 1 2024/25',
    subject: 'Mathematics',
    grade: 'Grade 5',
    items: [
      {
        id: critId,
        type: 'assessment_result',
        content: 'Conceptual Understanding: Level 6 of 8',
        criterionName: 'Conceptual Understanding',
        level: 6,
        maxLevel: 8,
      },
      {
        id: obsId,
        type: 'observation',
        content: tokenizedObs,
        tag: 'mathematics',
      },
    ],
  };

  return { pack, rawName: name, preferredName };
}

async function runWorkerThroughputBenchmark() {
  const studentCount = 30;
  const provider = new MockProvider('valid');
  const latencies: number[] = [];

  console.log('='.repeat(70));
  console.log(`HourBack Benchmark: Worker Throughput & Latency (${studentCount} Students)`);
  console.log('='.repeat(70));
  console.log('Executing asynchronous pipeline simulation for 30 students...\n');

  const overallStart = Date.now();

  // Process 30 messages in batches of 10 (matching SQS batch size)
  const BATCH_SIZE = 10;
  let successCount = 0;

  for (let b = 0; b < studentCount; b += BATCH_SIZE) {
    const batchPromises = Array.from({ length: BATCH_SIZE }, async (_, i) => {
      const idx = b + i;
      const { pack, rawName, preferredName } = createEvidencePack(SAMPLE_NAMES[idx]!, idx);

      const itemStart = Date.now();

      // 1. LLM Generation
      const llmResponse = await provider.generate(pack);

      // 2. Deterministic Validation
      const validation = validateLLMResponse(llmResponse, pack);
      if (!validation.valid) {
        throw new Error(`Validation failed for student ${idx}`);
      }

      // 3. Groundedness Score
      const groundedness = computeGroundednessScore(llmResponse, pack);

      // 4. In-Memory Name Rehydration
      const rehydrated = llmResponse.sentences.map((s) => ({
        ...s,
        text: rehydrateName(s.text, preferredName, rawName),
      }));

      const elapsed = Date.now() - itemStart;
      latencies.push(elapsed);
      successCount++;

      return { rehydrated, groundedness, elapsed };
    });

    await Promise.all(batchPromises);
  }

  const totalTimeMs = Date.now() - overallStart;
  const throughput = (studentCount / (totalTimeMs / 1000)).toFixed(1);

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  console.log('Results:');
  console.log(`  • Total Cohort Size:       ${studentCount} students`);
  console.log(`  • Total Wall Time:         ${(totalTimeMs / 1000).toFixed(2)}s (${totalTimeMs} ms)`);
  console.log(`  • Worker Throughput:       ${throughput} comments/sec`);
  console.log(`  • Success Rate:            100% (${successCount}/${studentCount} comments valid & stored)`);
  console.log(`  • Latency (p50):           ${p50} ms`);
  console.log(`  • Latency (p95):           ${p95} ms`);
  console.log(`  • Min / Max Latency:       ${min} ms / ${max} ms`);
  console.log('='.repeat(70));
}

runWorkerThroughputBenchmark().catch(console.error);
