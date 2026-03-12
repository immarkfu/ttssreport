import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  phone?: string;
  wechat_openid?: string;
  username?: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  login: (token: string, user: User, redirectUrl?: string) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 判断 token 是否为游客 token（非真实 JWT） */
function isGuestToken(token: string): boolean {
  return token === 'guest_token' || token === 'null' || token === 'undefined';
}

/** 简单检查 JWT 是否过期（不验证签名，仅解析 exp 字段） */
function isTokenExpired(token: string): boolean {
  if (isGuestToken(token)) return false; // 游客 token 永不过期
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      // 检查 token 是否过期，过期则清除
      if (isTokenExpired(savedToken)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return;
      }
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (newToken: string, newUser: User, redirectUrl?: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin';
  const isGuest = token ? isGuestToken(token) : false;

  return (
    <AuthContext.Provider value={{ user, token, isGuest, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
