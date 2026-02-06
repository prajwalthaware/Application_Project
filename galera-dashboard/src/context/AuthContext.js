import React, { createContext, useState, useEffect, useContext } from 'react';
import { checkLogin, logout as logoutApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await checkLogin();
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperUser: user?.role === 'super_user',
    isAdmin: user?.role === 'super_user', // Keep for backward compatibility
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
