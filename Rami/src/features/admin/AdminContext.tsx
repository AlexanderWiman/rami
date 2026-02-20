/**
 * Admin authentication context.
 * Provides admin state and auth functions throughout the app.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { checkAuth, login as apiLogin, logout as apiLogout } from '../forum/api';
import type { Admin } from '../forum/types';

interface AdminContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const adminData = await checkAuth();
      setAdmin(adminData);
    } catch {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    setAdmin(response.admin);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAdmin(null);
  }, []);

  const value: AdminContextType = {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    isSuperadmin: admin?.role === 'superadmin',
    login,
    logout,
    refreshAuth,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
