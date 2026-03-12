import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config';

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [wechatQrUrl, setWechatQrUrl] = useState('');
  const [error, setError] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
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
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      if (res.ok) {
        const data = await res.json();
        const targetUrl = data.user?.role === 'admin' ? '/user-management' : '/';
        login(data.token, data.user, targetUrl);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || '登录失败，请检查手机号和验证码');
      }
    } catch {
      setError('网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchWechatQrUrl = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/wechat/login-url?state=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.url && data.url.includes('appid')) {
            setWechatQrUrl(data.url);
          }
        }
      } catch {
        // 微信登录未配置时静默忽略
      }
    };
    fetchWechatQrUrl();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-96 p-6">
        <h1 className="text-2xl font-bold text-center mb-2">登录</h1>
        <p className="text-center text-sm text-gray-500 mb-6">知行量化数据平台</p>
        <Tabs defaultValue="phone">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">手机验证码</TabsTrigger>
            <TabsTrigger value="wechat">微信扫码</TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-3 mt-4">
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
              onKeyDown={e => e.key === 'Enter' && sendCode()}
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
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
            <Button
              variant="outline"
              className="w-full text-gray-500"
              onClick={() => {
                login('guest_token', { id: 0, username: '游客', role: 'comm', status: 'active' }, '/');
              }}
            >
              游客访问（只读）
            </Button>
            <div className="text-center text-sm pt-1">
              <a href="/register" className="text-blue-600 hover:underline">注册新账号</a>
            </div>
          </TabsContent>

          <TabsContent value="wechat" className="space-y-4 mt-4">
            <div className="flex flex-col items-center">
              {wechatQrUrl ? (
                <div className="p-4 bg-white border rounded">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wechatQrUrl)}`}
                    alt="微信登录二维码"
                    className="w-48 h-48"
                  />
                  <p className="text-center text-sm text-gray-500 mt-2">使用微信扫码登录</p>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <p className="text-sm">微信登录暂未配置</p>
                  <p className="text-xs mt-1">请使用手机验证码登录</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
