import { gql } from '@apollo/client';

export const GET_CLASS_ROSTER = gql`
  query GetClassRoster($classId: ID!, $periodId: ID!) {
    classRoster(classId: $classId, periodId: $periodId) {
      id
      name
      preferredName
      reportComment(periodId: $periodId) {
        id
        status
        draftText
        groundednessScore
        generationMs
      }
    }
  }
`;

export const GET_STUDENT_EVIDENCE = gql`
  query GetStudentEvidence($studentId: ID!) {
    studentEvidence(studentId: $studentId) {
      assessmentResults {
        id
        level
        feedback
        criterion {
          id
          name
          maxLevel
          description
        }
      }
      observations {
        id
        text
        tag
        createdAt
      }
    }
  }
`;

export const GET_REPORT_COMMENT = gql`
  query GetReportComment($studentId: ID!, $periodId: ID!) {
    reportComment(studentId: $studentId, periodId: $periodId) {
      id
      draftText
      finalText
      status
      model
      groundednessScore
      editDistance
      generationMs
      tone
      length
      citations {
        sentenceIdx
        sourceType
        sourceId
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_GENERATION_JOB = gql`
  query GetGenerationJob($jobId: ID!) {
    generationJob(jobId: $jobId) {
      id
      total
      done
      failed
      status
    }
  }
`;

export const GET_TIME_SAVED_SUMMARY = gql`
  query GetTimeSavedSummary($classId: ID!, $periodId: ID!) {
    timeSavedSummary(classId: $classId, periodId: $periodId) {
      periodId
      manualAvgSeconds
      assistedAvgSeconds
      timeSavedSeconds
      timeSavedPercent
      commentCount
    }
  }
`;

export const GENERATE_COMMENTS = gql`
  mutation GenerateComments($classId: ID!, $periodId: ID!, $tone: CommentTone!, $length: CommentLength!) {
    generateComments(classId: $classId, periodId: $periodId, tone: $tone, length: $length) {
      id
      total
      done
      failed
      status
    }
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($commentId: ID!, $text: String!) {
    updateComment(commentId: $commentId, text: $text) {
      id
      finalText
      status
      editDistance
      updatedAt
    }
  }
`;

export const APPROVE_COMMENT = gql`
  mutation ApproveComment($commentId: ID!, $timeTakenSeconds: Int!) {
    approveComment(commentId: $commentId, timeTakenSeconds: $timeTakenSeconds) {
      id
      status
      updatedAt
    }
  }
`;

export const ADD_OBSERVATION = gql`
  mutation AddObservation($studentId: ID!, $text: String!, $tag: String) {
    addObservation(studentId: $studentId, text: $text, tag: $tag) {
      id
      text
      tag
      createdAt
    }
  }
`;

export const LOG_MANUAL_TIME = gql`
  mutation LogManualTime($studentId: ID!, $periodId: ID!, $seconds: Int!) {
    logManualTime(studentId: $studentId, periodId: $periodId, seconds: $seconds)
  }
`;

export const REGENERATE_COMMENT = gql`
  mutation RegenerateComment($commentId: ID!, $tone: CommentTone, $length: CommentLength) {
    regenerateComment(commentId: $commentId, tone: $tone, length: $length) {
      id
      total
      done
      failed
      status
    }
  }
`;

export const GET_TEACHER_CLASSES = gql`
  query GetTeacherClasses {
    me {
      id
      name
      email
      school
    }
    classes {
      id
      name
      grade
      subject
      academicYear
      reportPeriods {
        id
        name
        startDate
        endDate
      }
    }
  }
`;
