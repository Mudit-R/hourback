export const typeDefs = /* GraphQL */ `
  scalar DateTime

  # ─── Enums ────────────────────────────────────────────────────────────────
  enum CommentStatus {
    draft
    edited
    approved
    flagged
  }

  enum JobStatus {
    pending
    running
    completed
    partial
    failed
  }

  enum CommentTone {
    warm
    formal
    encouraging
  }

  enum CommentLength {
    short
    medium
    long
  }

  enum TimeLogMode {
    manual
    assisted
  }

  # ─── Core Types ───────────────────────────────────────────────────────────
  type Teacher {
    id: ID!
    name: String!
    email: String!
    school: String!
    classes: [Class!]!
  }

  type Class {
    id: ID!
    name: String!
    grade: String!
    subject: String!
    academicYear: String!
    teacher: Teacher!
    students: [Student!]!
    reportPeriods: [ReportPeriod!]!
  }

  type Student {
    id: ID!
    name: String!
    preferredName: String
    class: Class!
    evidence: StudentEvidence!
    reportComment(periodId: ID!): ReportComment
  }

  type StudentEvidence {
    assessmentResults: [AssessmentResult!]!
    observations: [Observation!]!
  }

  type Criterion {
    id: ID!
    name: String!
    maxLevel: Int!
    description: String
    sortOrder: Int!
  }

  type AssessmentResult {
    id: ID!
    criterion: Criterion!
    level: Int!
    feedback: String
  }

  type Observation {
    id: ID!
    text: String!
    tag: String
    createdAt: DateTime!
  }

  type ReportPeriod {
    id: ID!
    name: String!
    startDate: String!
    endDate: String!
  }

  type CommentCitation {
    sentenceIdx: Int!
    sourceType: String!
    sourceId: ID!
  }

  type ReportComment {
    id: ID!
    student: Student!
    period: ReportPeriod!
    draftText: String!
    finalText: String
    status: CommentStatus!
    model: String
    groundednessScore: Float
    editDistance: Int
    generationMs: Int
    tone: CommentTone
    length: CommentLength
    citations: [CommentCitation!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GenerationJob {
    id: ID!
    classId: ID!
    periodId: ID!
    total: Int!
    done: Int!
    failed: Int!
    status: JobStatus!
  }

  type TimeSavedSummary {
    periodId: ID!
    manualAvgSeconds: Float
    assistedAvgSeconds: Float
    timeSavedSeconds: Float
    timeSavedPercent: Float
    commentCount: Int!
  }

  type AuthPayload {
    token: String!
    teacher: Teacher!
  }

  type ActivityItem {
    id: ID!
    type: String!
    title: String!
    description: String!
    timestamp: DateTime!
    actor: String!
  }

  type AIAssistantResponse {
    reply: String!
    suggestions: [String!]!
  }

  # ─── Queries ──────────────────────────────────────────────────────────────
  type Query {
    """Current authenticated teacher profile."""
    me: Teacher

    """List of registered teachers for switching / directory / demo login."""
    teachers: [Teacher!]!

    """Classes taught by the current teacher."""
    classes: [Class!]!

    """Real-time institutional activity and audit updates."""
    activityFeed(classId: ID): [ActivityItem!]!

    """
    Returns all students in a class with their latest comment status for a period.
    Uses DataLoader to batch evidence queries (eliminates N+1).
    """
    classRoster(classId: ID!, periodId: ID!): [Student!]!

    """Returns all evidence (criteria results + observations) for one student."""
    studentEvidence(studentId: ID!): StudentEvidence!

    """Returns a single report comment."""
    reportComment(studentId: ID!, periodId: ID!): ReportComment

    """Aggregated time-saved analytics for a class+period."""
    timeSavedSummary(classId: ID!, periodId: ID!): TimeSavedSummary!

    """Poll job progress (used as subscription fallback)."""
    generationJob(jobId: ID!): GenerationJob

    """HourBack AI Teaching Assistant Co-pilot for curriculum, insights, and parent communication."""
    askAIAssistant(classId: ID!, prompt: String!): AIAssistantResponse!
  }

  input StudentImportInput {
    name: String!
    preferredName: String
    rubricLevel: Int
    observation: String
  }

  # ─── Mutations ────────────────────────────────────────────────────────────
  type Mutation {
    """Sign in with email and optional password."""
    login(email: String!, password: String): AuthPayload!

    """Register a new educator account."""
    signup(name: String!, email: String!, school: String!, password: String): AuthPayload!

    """Bulk import student roster, initial rubric levels, and observations from CSV/spreadsheet."""
    bulkImportStudents(classId: ID!, students: [StudentImportInput!]!): Int!

    """Register a new class with automatic default criteria and reporting period."""
    createClass(name: String!, grade: String!, subject: String!, academicYear: String!): Class!

    """Update class details (name, grade, subject, academic year)."""
    updateClass(classId: ID!, name: String, grade: String, subject: String, academicYear: String): Class!

    """Register a new student in a class with baseline assessment records."""
    registerStudent(classId: ID!, name: String!, preferredName: String): Student!

    """Update student details."""
    updateStudent(studentId: ID!, name: String, preferredName: String): Student!

    """Remove a student from class roster."""
    removeStudent(studentId: ID!): Boolean!

    """Add a free-text observation for a student."""
    addObservation(studentId: ID!, text: String!, tag: String): Observation!

    """Update a student's criteria level directly in the gradebook."""
    updateAssessmentResult(resultId: ID!, level: Int!, feedback: String): AssessmentResult!

    """
    Enqueues one SQS message per student in the class.
    Returns a job ID immediately; poll generationJob for progress.
    """
    generateComments(
      classId: ID!
      periodId: ID!
      tone: CommentTone!
      length: CommentLength!
    ): GenerationJob!

    """Save teacher edits to a draft comment."""
    updateComment(commentId: ID!, text: String!): ReportComment!

    """Mark a comment as approved; records time log."""
    approveComment(commentId: ID!, timeTakenSeconds: Int!): ReportComment!

    """Re-queue a single student's comment for regeneration."""
    regenerateComment(commentId: ID!, tone: CommentTone, length: CommentLength): GenerationJob!

    """Record a manual baseline time log (for time-saved analytics)."""
    logManualTime(studentId: ID!, periodId: ID!, seconds: Int!): Boolean!
  }

  # ─── Subscription (schema stub — transport is polling in this version) ─────
  #
  # Trade-off note (decisions.md §4):
  # A real GraphQL subscription requires sticky load-balancer sessions and
  # WebSocket heartbeat management. For a 30-student class where workers run
  # ~2-3 s each, a 3-second poll on generationJob is UX-equivalent with zero
  # extra infrastructure. This stub is here to show awareness of the pattern.
  #
  type Subscription {
    commentJobProgress(jobId: ID!): GenerationJob
  }
`;
