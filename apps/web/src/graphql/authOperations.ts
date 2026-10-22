import { gql } from '@apollo/client';

export const QUERY_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      school
    }
  }
`;

export const QUERY_TEACHERS = gql`
  query GetTeachers {
    teachers {
      id
      name
      email
      school
    }
  }
`;

export const MUTATION_LOGIN = gql`
  mutation Login($email: String!, $password: String) {
    login(email: $email, password: $password) {
      token
      teacher {
        id
        name
        email
        school
      }
    }
  }
`;

export const MUTATION_SIGNUP = gql`
  mutation Signup($name: String!, $email: String!, $school: String!, $password: String) {
    signup(name: $name, email: $email, school: $school, password: $password) {
      token
      teacher {
        id
        name
        email
        school
      }
    }
  }
`;

export const MUTATION_CREATE_CLASS = gql`
  mutation CreateClass($name: String!, $grade: String!, $subject: String!, $academicYear: String!) {
    createClass(name: $name, grade: $grade, subject: $subject, academicYear: $academicYear) {
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

export const MUTATION_UPDATE_CLASS = gql`
  mutation UpdateClass($classId: ID!, $name: String, $grade: String, $subject: String, $academicYear: String) {
    updateClass(classId: $classId, name: $name, grade: $grade, subject: $subject, academicYear: $academicYear) {
      id
      name
      grade
      subject
      academicYear
    }
  }
`;

export const MUTATION_REGISTER_STUDENT = gql`
  mutation RegisterStudent($classId: ID!, $name: String!, $preferredName: String) {
    registerStudent(classId: $classId, name: $name, preferredName: $preferredName) {
      id
      name
      preferredName
    }
  }
`;

export const MUTATION_UPDATE_STUDENT = gql`
  mutation UpdateStudent($studentId: ID!, $name: String, $preferredName: String) {
    updateStudent(studentId: $studentId, name: $name, preferredName: $preferredName) {
      id
      name
      preferredName
    }
  }
`;

export const MUTATION_REMOVE_STUDENT = gql`
  mutation RemoveStudent($studentId: ID!) {
    removeStudent(studentId: $studentId)
  }
`;

export const QUERY_ACTIVITY_FEED = gql`
  query GetActivityFeed($classId: ID) {
    activityFeed(classId: $classId) {
      id
      type
      title
      description
      timestamp
      actor
    }
  }
`;
