import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!token && !savedToken) {
      setLocation('/login');
      return;
    }
    
    if (requireAdmin && user?.role !== 'admin') {
      setLocation('/');
    }
  }, [token, user, requireAdmin, setLocation]);

  const savedToken = localStorage.getItem('token');
  if (!token && !savedToken) return null;
  if (requireAdmin && user?.role !== 'admin') return null;

  return <>{children}</>;
}
