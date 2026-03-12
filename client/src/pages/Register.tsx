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
  const [error, setError] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePhone = (p: string) => /^1[3-9]\d{9}$/.test(p);

  const sendCode = async () => {
    setError('');
    setSendMsg('');
    if (!validatePhone(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/users/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        setSendMsg('验证码已发送，请注意查收');
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
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || '验证码发送失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请检查网络连接后重试');
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!validatePhone(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code || code.length < 4) {
      setError('请输入验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, username: username || undefined })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 400) {
          setError(data.detail || '注册失败，该手机号可能已注册或验证码错误');
        } else {
          setError(data.detail || '注册失败，请稍后重试');
        }
      }
    } catch {
      setError('网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96 p-6 text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">注册成功！</h2>
          <p className="text-gray-500 text-sm">正在跳转到登录页面...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-96 p-6">
        <h1 className="text-2xl font-bold text-center mb-2">注册</h1>
        <p className="text-center text-sm text-gray-500 mb-6">知行量化数据平台</p>
        <div className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          {sendMsg && !error && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
              {sendMsg}
            </div>
          )}
          <Input
            placeholder="手机号"
            value={phone}
            maxLength={11}
            onChange={e => {
              setPhone(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
          />
          <div className="flex gap-2">
            <Input
              placeholder="验证码"
              value={code}
              maxLength={6}
              onChange={e => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
            />
            <Button
              onClick={sendCode}
              disabled={countdown > 0 || !phone}
              variant="outline"
              className="shrink-0 w-24"
            >
              {countdown > 0 ? `${countdown}s` : '发送'}
            </Button>
          </div>
          <Input
            placeholder="用户名（可选，默认使用手机尾号）"
            value={username}
            maxLength={20}
            onChange={e => setUsername(e.target.value)}
          />
          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </Button>
          <div className="text-center text-sm pt-1">
            <a href="/login" className="text-blue-600 hover:underline">已有账号？去登录</a>
          </div>
        </div>
      </Card>
    </div>
  );
}
