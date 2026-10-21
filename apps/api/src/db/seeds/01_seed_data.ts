import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

// ── Helper ────────────────────────────────────────────────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ── Observation pools ─────────────────────────────────────────────────────────
const OBS_MATH = [
  'Demonstrated strong number sense when solving multi-step word problems independently.',
  'Consistently applied the area model strategy when multiplying two-digit numbers.',
  'Needed prompting to check reasonableness of answers during timed practice.',
  'Showed curiosity by posing an extension question about fractions during group work.',
  'Transferred multiplication strategies to a novel context without teacher support.',
  'Struggled to decompose mixed-number fractions; benefited from manipulative use.',
  'Led the group in designing a data display for the class survey project.',
  'Accurately identified patterns in the multiplication table and explained reasoning.',
];

const OBS_COLLAB = [
  'Actively listened to peers and paraphrased their ideas before responding.',
  'Took on the recorder role during inquiry and ensured all voices were captured.',
  'Required reminders to allow peers to finish speaking before contributing.',
  'Offered constructive feedback during peer-editing using agreed criteria.',
  'Struggled to compromise when group disagreed on a direction; teacher mediated.',
  'Initiated a fair rotation of roles during the three-day group project.',
  'Demonstrated empathy when a partner was frustrated; paused work to check in.',
  'Contributed relevant ideas consistently and acknowledged others by name.',
];

const OBS_WRITING = [
  'Crafted a compelling narrative introduction with a clear hook and setting.',
  'Used a variety of sentence structures including compound-complex sentences.',
  'Editing checklist usage improved paragraph cohesion significantly this term.',
  'First drafts showed strong voice; revision stage needed more teacher guidance.',
  'Incorporated feedback from the previous draft to sharpen argument structure.',
  'Demonstrated control of punctuation including semi-colons in expository writing.',
  'Peer-review feedback was specific and referenced the success criteria accurately.',
  'Word choice was vivid and precise; showed evidence of vocabulary log use.',
];

const OBS_INQUIRY = [
  'Formulated a researchable question independently during the tuning-in phase.',
  'Cross-referenced two sources before accepting a claim as accurate.',
  'Made connections between the unit central idea and a personal experience.',
  'Showed persistence when initial hypothesis was disproved by data collected.',
  'Presented findings clearly with a visual aid and handled audience questions well.',
  'Needed scaffolding to move from descriptive to analytical level of response.',
  'Designed a fair test with controlled variables and justified each choice in writing.',
  'Reflected on learning process in the portfolio entry with specific examples.',
];

const OBS_POOLS = [OBS_MATH, OBS_COLLAB, OBS_WRITING, OBS_INQUIRY];
const OBS_TAGS = ['mathematics', 'collaboration', 'writing', 'inquiry'];

// ── Student names ─────────────────────────────────────────────────────────────
const NAMES_CLASS_A = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Karan Patel',
  'Divya Reddy', 'Arjun Singh', 'Sneha Gupta', 'Vikram Joshi', 'Meera Pillai',
  'Aditya Kumar', 'Pooja Verma', 'Rahul Bose', 'Shreya Agarwal', 'Nikhil Rao',
  'Anjali Mishra', 'Siddharth Nair', 'Kavya Menon', 'Ravi Chandra', 'Neha Saxena',
  'Akash Tripathi', 'Lakshmi Das', 'Vivek Bansal', 'Tanvi Shah', 'Manish Yadav',
  'Riya Kapoor', 'Gaurav Pandey', 'Ishaan Srivastava', 'Pallavi Desai', 'Suresh Hegde',
];

const NAMES_CLASS_B = [
  'Lena Fischer', 'Marco Bianchi', 'Aiko Tanaka', 'Fatima Al-Hassan', 'James Okafor',
  'Sofia Petrov', 'Ethan Williams', 'Mei Lin', 'Omar Diallo', 'Clara Müller',
  'Noah Andersen', 'Yuki Sato', 'Amina Kofi', 'Lucas Dupont', 'Zara Ahmed',
  'Samuel Adeyemi', 'Hana Nakamura', 'Alex Chen', 'Layla Ibrahim', 'Finn Larsen',
  'Isabella Romano', 'Kwame Mensah', 'Nia Osei', 'Matteo Ferrari', 'Chiara Rossi',
  'Diego Hernandez', 'Yara Abbas', 'Jakub Novak', 'Amara Diop', 'Elias Berg',
];

// Criteria for two subjects (PYP ATL style, levels 1-8)
const CRITERIA_MATH = [
  { name: 'Conceptual Understanding', max_level: 8, sort_order: 0 },
  { name: 'Problem-Solving Strategies', max_level: 8, sort_order: 1 },
  { name: 'Mathematical Communication', max_level: 8, sort_order: 2 },
  { name: 'Self-Management & Reflection', max_level: 8, sort_order: 3 },
];

const CRITERIA_ENGLISH = [
  { name: 'Reading Comprehension', max_level: 8, sort_order: 0 },
  { name: 'Writing Craft & Voice', max_level: 8, sort_order: 1 },
  { name: 'Research & Inquiry Skills', max_level: 8, sort_order: 2 },
  { name: 'Collaboration in Discussion', max_level: 8, sort_order: 3 },
];

const FEEDBACK_BY_LEVEL: Record<number, string> = {
  1: 'Beginning to demonstrate understanding with significant support.',
  2: 'Developing foundational skills with consistent teacher guidance.',
  3: 'Approaching expectations; requires occasional prompting.',
  4: 'Meeting grade-level expectations independently.',
  5: 'Consistently meeting expectations with growing confidence.',
  6: 'Exceeding expectations; applies learning in new contexts.',
  7: 'Demonstrating sophisticated understanding beyond grade level.',
  8: 'Exemplary performance; serves as a model for peers.',
};

export async function seed(knex: Knex): Promise<void> {
  // Truncate all tables in reverse FK order
  await knex.raw(`
    TRUNCATE TABLE
      time_logs, comment_citations, report_comments,
      generation_jobs, observations, assessment_results,
      report_periods, criteria, assessments, units,
      students, classes, teachers
    RESTART IDENTITY CASCADE
  `);

  // ── Teacher ────────────────────────────────────────────────────────────────
  const teacherId = uuidv4();
  await knex('teachers').insert({
    id: teacherId,
    name: 'Ms. Anita Rao',
    email: 'anita.rao@school.example.com',
    school: 'Delhi International School',
  });

  // ── Classes ────────────────────────────────────────────────────────────────
  const classAId = uuidv4();
  const classBId = uuidv4();

  await knex('classes').insert([
    {
      id: classAId,
      teacher_id: teacherId,
      name: 'Grade 5A — Mathematics',
      grade: 'Grade 5',
      subject: 'Mathematics',
      academic_year: '2024-2025',
    },
    {
      id: classBId,
      teacher_id: teacherId,
      name: 'Grade 5B — English Language Arts',
      grade: 'Grade 5',
      subject: 'English Language Arts',
      academic_year: '2024-2025',
    },
  ]);

  // ── Units ──────────────────────────────────────────────────────────────────
  const unitAId = uuidv4();
  const unitBId = uuidv4();

  await knex('units').insert([
    {
      id: unitAId,
      class_id: classAId,
      title: 'Fractions, Decimals & Percentages',
      description: 'Students explore the relationship between fractions, decimals and percentages in real-world contexts.',
      start_date: '2025-01-13',
      end_date: '2025-03-14',
    },
    {
      id: unitBId,
      class_id: classBId,
      title: 'Narratives That Transform',
      description: 'Students craft and revise personal narratives exploring themes of identity and change.',
      start_date: '2025-01-13',
      end_date: '2025-03-14',
    },
  ]);

  // ── Assessments ────────────────────────────────────────────────────────────
  const assessAId = uuidv4();
  const assessBId = uuidv4();

  await knex('assessments').insert([
    { id: assessAId, unit_id: unitAId, title: 'Semester 1 Math Assessment', type: 'criteria' },
    { id: assessBId, unit_id: unitBId, title: 'Semester 1 ELA Assessment', type: 'criteria' },
  ]);

  // ── Criteria ───────────────────────────────────────────────────────────────
  const criteriaMathIds: string[] = [];
  const criteriaELAIds: string[] = [];

  for (const c of CRITERIA_MATH) {
    const id = uuidv4();
    criteriaMathIds.push(id);
    await knex('criteria').insert({ id, assessment_id: assessAId, ...c });
  }

  for (const c of CRITERIA_ENGLISH) {
    const id = uuidv4();
    criteriaELAIds.push(id);
    await knex('criteria').insert({ id, assessment_id: assessBId, ...c });
  }

  // ── Report Periods ─────────────────────────────────────────────────────────
  const periodAId = uuidv4();
  const periodBId = uuidv4();

  await knex('report_periods').insert([
    {
      id: periodAId,
      class_id: classAId,
      name: 'Semester 1 — 2024/25',
      start_date: '2024-08-01',
      end_date: '2025-01-10',
    },
    {
      id: periodBId,
      class_id: classBId,
      name: 'Semester 1 — 2024/25',
      start_date: '2024-08-01',
      end_date: '2025-01-10',
    },
  ]);

  // ── Students + Assessment Results + Observations ───────────────────────────
  async function seedClass(
    classId: string,
    names: string[],
    criteriaIds: string[],
    obsPools: string[][],
    obsTags: string[],
  ): Promise<void> {
    for (const name of names) {
      const studentId = uuidv4();

      await knex('students').insert({
        id: studentId,
        class_id: classId,
        name,
        preferred_name: name.split(' ')[0],
      });

      // Assessment results — 4 criteria, levels distributed realistically
      for (let ci = 0; ci < criteriaIds.length; ci++) {
        // Skew towards mid-range (3-6), occasional high/low
        const level = randInt(2, 7);
        await knex('assessment_results').insert({
          id: uuidv4(),
          student_id: studentId,
          criterion_id: criteriaIds[ci] as string,
          level,
          feedback: FEEDBACK_BY_LEVEL[level] ?? '',
        });
      }

      // Observations — 3-5 per student across different tags
      const numObs = randInt(3, 5);
      const usedPools = new Set<number>();

      for (let oi = 0; oi < numObs; oi++) {
        let poolIdx: number;
        do {
          poolIdx = randInt(0, obsPools.length - 1);
        } while (usedPools.has(poolIdx) && usedPools.size < obsPools.length);
        usedPools.add(poolIdx);

        const pool = obsPools[poolIdx] as string[];
        const text = pick(pool);
        const tag = obsTags[poolIdx] as string;

        // Spread timestamps across the semester
        const daysAgo = randInt(10, 120);
        const createdAt = new Date(Date.now() - daysAgo * 86400 * 1000);

        await knex('observations').insert({
          id: uuidv4(),
          student_id: studentId,
          text,
          tag,
          created_at: createdAt.toISOString(),
        });
      }
    }
  }

  await seedClass(classAId, NAMES_CLASS_A, criteriaMathIds, OBS_POOLS, OBS_TAGS);
  await seedClass(classBId, NAMES_CLASS_B, criteriaELAIds, OBS_POOLS, OBS_TAGS);

  console.warn(
    `Seed complete: 2 classes, ${NAMES_CLASS_A.length + NAMES_CLASS_B.length} students, criteria-based results and observations inserted.`,
  );
}
