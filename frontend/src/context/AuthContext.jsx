import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('paywallet_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('paywallet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

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

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      setToken(data.accessToken);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    try {
      const data = await authApi.register(username, email, password);
      setToken(data.accessToken);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('paywallet_token');
    localStorage.removeItem('paywallet_user');
  }, []);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
