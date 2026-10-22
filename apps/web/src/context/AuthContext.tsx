import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import {
  QUERY_ME,
  QUERY_TEACHERS,
  MUTATION_LOGIN,
  MUTATION_SIGNUP,
} from '../graphql/authOperations';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  school: string;
}

interface AuthContextType {
  teacher: Teacher | null;
  teachers: Teacher[];
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, school: string, password?: string) => Promise<boolean>;
  switchTeacher: (teacherId: string) => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup';
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = useApolloClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(QUERY_ME, {
    fetchPolicy: 'network-only',
  });
  const { data: teachersData, refetch: refetchTeachers } = useQuery(QUERY_TEACHERS, {
    fetchPolicy: 'network-only',
  });

  const [loginMutation] = useMutation(MUTATION_LOGIN);
  const [signupMutation] = useMutation(MUTATION_SIGNUP);

  const teacher: Teacher | null = meData?.me ?? null;
  const teachers: Teacher[] = teachersData?.teachers ?? [];

  useEffect(() => {
    if (teacher && !localStorage.getItem('teacherId')) {
      localStorage.setItem('teacherId', teacher.id);
    }
  }, [teacher]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await loginMutation({ variables: { email, password } });
      const payload = res.data?.login;
      if (payload?.teacher?.id) {
        localStorage.setItem('teacherId', payload.teacher.id);
        if (payload.token) localStorage.setItem('authToken', payload.token);
        await client.resetStore();
        await Promise.all([refetchMe(), refetchTeachers()]);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to log in:', err);
      return false;
    }
  };

  const signup = async (
    name: string,
    email: string,
    school: string,
    password?: string,
  ): Promise<boolean> => {
    try {
      const res = await signupMutation({ variables: { name, email, school, password } });
      const payload = res.data?.signup;
      if (payload?.teacher?.id) {
        localStorage.setItem('teacherId', payload.teacher.id);
        if (payload.token) localStorage.setItem('authToken', payload.token);
        await client.resetStore();
        await Promise.all([refetchMe(), refetchTeachers()]);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to register educator:', err);
      return false;
    }
  };

  const switchTeacher = async (teacherId: string) => {
    localStorage.setItem('teacherId', teacherId);
    await client.resetStore();
    await Promise.all([refetchMe(), refetchTeachers()]);
  };

  const logout = () => {
    localStorage.removeItem('teacherId');
    localStorage.removeItem('authToken');
    setIsAuthModalOpen(true);
    setAuthModalMode('signin');
  };

  return (
    <AuthContext.Provider
      value={{
        teacher,
        teachers,
        loading: meLoading,
        login,
        signup,
        switchTeacher,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
