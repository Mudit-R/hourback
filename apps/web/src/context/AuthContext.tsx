import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import {
  QUERY_ME,
  MUTATION_LOGIN,
  MUTATION_SIGNUP,
  MUTATION_LOGOUT,
} from '../graphql/authOperations';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  school: string;
}

interface AuthContextType {
  teacher: Teacher | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, school: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  const { data: meData, loading: meLoading } = useQuery(QUERY_ME, {
    fetchPolicy: 'network-only',
  });

  const [loginMutation] = useMutation(MUTATION_LOGIN);
  const [signupMutation] = useMutation(MUTATION_SIGNUP);
  const [logoutMutation] = useMutation(MUTATION_LOGOUT);

  const teacher: Teacher | null = meData?.me ?? null;

  useEffect(() => {
    // Remove the old demo identity headers; identity now comes from the HttpOnly session.
    localStorage.removeItem('teacherId');
    localStorage.removeItem('authToken');
  }, []);

  useEffect(() => {
    if (!meLoading && !teacher) {
      setIsAuthModalOpen(true);
    }
  }, [meLoading, teacher]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await loginMutation({ variables: { email, password } });
      const payload = res.data?.login;
      if (payload?.teacher?.id) {
        await client.resetStore();
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
        await client.resetStore();
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to register educator:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation();
    } finally {
      await client.clearStore();
      setIsAuthModalOpen(true);
      setAuthModalMode('signin');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        teacher,
        loading: meLoading,
        login,
        signup,
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
