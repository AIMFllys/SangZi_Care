'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isReady: false,
  isAuthenticated: false,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
