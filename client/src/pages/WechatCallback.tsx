import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config';

export default function WechatCallback() {
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(user => {
        const targetUrl = user.role === 'admin' ? '/user-management' : '/';
        login(token, user, targetUrl);
      })
      .catch(() => {
        window.location.href = '/login';
      });
    } else {
      window.location.href = '/login';
    }
  }, [login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl mb-4">登录中...</div>
      </div>
    </div>
  );
}
