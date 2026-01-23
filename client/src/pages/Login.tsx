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

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      if (res.ok) {
        const data = await res.json();
        const targetUrl = data.user.role === 'admin' ? '/user-management' : '/';
        login(data.token, data.user, targetUrl);
      }
    } catch (error) {
      
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
      } catch (error) {
        
      }
    };
    fetchWechatQrUrl();
  }, []);

  const handleSimpleQrLogin = () => {
    login('guest_token', { id: 0, username: 'konna666', role: 'comm', status: 'active' }, '/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-96 p-6">
        <h1 className="text-2xl font-bold text-center mb-6">登录</h1>
        <Tabs defaultValue="phone">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">手机验证码</TabsTrigger>
            <TabsTrigger value="wechat">微信扫码</TabsTrigger>
          </TabsList>
          <TabsContent value="phone" className="space-y-4">
            <div>
              <Input
                placeholder="手机号"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
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
            <Button className="w-full" onClick={handleLogin}>
              登录
            </Button>
            <Button variant="outline" className="w-full" onClick={() => {
              login('guest_token', { id: 0, username: '游客', role: 'comm', status: 'active' }, '/');
            }}>
              游客访问
            </Button>
            <div className="text-center text-sm">
              <a href="/register" className="text-blue-600">注册新账号</a>
            </div>
          </TabsContent>
          <TabsContent value="wechat" className="space-y-4">
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
                <div className="p-4 bg-white border rounded">
                  <div className="cursor-pointer" onClick={handleSimpleQrLogin}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=konna666`}
                      alt="快速登录二维码"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">点击二维码快速登录</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
