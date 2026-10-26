import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '@/types';
import { authApi } from '@/api/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('paywallet_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('paywallet_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('paywallet_token', token);
    } else {
      localStorage.removeItem('paywallet_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('paywallet_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('paywallet_user');
    }
  }, [user]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('paywallet_token');
    localStorage.removeItem('paywallet_user');
  }, []);

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [logout]);

  const login = useCallback(async (username: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const data = await authApi.login(username, password);
      setToken(data.accessToken);
      setUser(data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const data = await authApi.register(username, email, password);
      setToken(data.accessToken);
      setUser(data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
