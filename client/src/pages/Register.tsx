import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { API_BASE_URL } from '@/config';

export default function Register() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [countdown, setCountdown] = useState(0);

  const sendCode = async () => {
    const res = await fetch(`${API_BASE_URL}/users/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    if (res.ok) {
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleRegister = async () => {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, username })
    });
    if (res.ok) {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-96 p-6">
        <h1 className="text-2xl font-bold text-center mb-6">注册</h1>
        <div className="space-y-4">
          <Input
            placeholder="手机号"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="验证码"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <Button
              onClick={sendCode}
              disabled={countdown > 0 || !phone}
            >
              {countdown > 0 ? `${countdown}s` : '发送'}
            </Button>
          </div>
          <Input
            placeholder="用户名（可选）"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <Button className="w-full" onClick={handleRegister}>
            注册
          </Button>
          <div className="text-center text-sm">
            <a href="/login" className="text-blue-600">已有账号？去登录</a>
          </div>
        </div>
      </Card>
    </div>
  );
}
