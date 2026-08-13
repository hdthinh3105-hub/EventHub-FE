import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authApi, type RegisterInput } from '@/api/auth';
import { getStoredUser, setSession, clearSession, handleExpiredSession } from '@/api/client';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBooting: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
    };
    window.addEventListener('eh:logout', handleForcedLogout);
    const timer = setTimeout(() => setIsBooting(false), 50);
    return () => {
      window.removeEventListener('eh:logout', handleForcedLogout);
      clearTimeout(timer);
    };
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser(next);
    const refreshToken = localStorage.getItem('eh_refresh_token');
    const accessToken = localStorage.getItem('eh_access_token');
    if (accessToken && refreshToken) {
      setSession(accessToken, refreshToken, next);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await authApi.login(email, password);
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const payload = await authApi.register(input);
    setUser(payload.user);
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    clearSession();
    handleExpiredSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isBooting,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider');
  return ctx;
}