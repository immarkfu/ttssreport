import { API_BASE_URL } from '@/config';

export interface User {
  id: number;
  phone?: string;
  wechat_openid?: string;
  username?: string;
  role: string;
  status: string;
}

export const authService = {
  async me(): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    return response.json();
  },

  async logout(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to logout');
    return response.json();
  },
};
