import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/config';

interface User {
  id: number;
  phone?: string;
  wechat_openid?: string;
  username?: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/${editUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: editUser.username,
        role: editUser.role,
        status: editUser.status
      })
    });
    if (res.ok) {
      setEditUser(null);
      fetchUsers();
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">账号管理</h1>
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">手机号</th>
              <th className="px-4 py-3 text-left">用户名</th>
              <th className="px-4 py-3 text-left">角色</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-3">{user.id}</td>
                <td className="px-4 py-3">{user.phone || user.wechat_openid}</td>
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3">{new Date(user.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Button size="sm" onClick={() => setEditUser(user)} className="mr-2">
                    编辑
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                    删除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <Input
                placeholder="用户名"
                value={editUser.username || ''}
                onChange={e => setEditUser({ ...editUser, username: e.target.value })}
              />
              <select
                className="w-full border rounded px-3 py-2"
                value={editUser.role}
                onChange={e => setEditUser({ ...editUser, role: e.target.value })}
              >
                <option value="comm">普通用户</option>
                <option value="vip">VIP</option>
                <option value="admin">管理员</option>
              </select>
              <select
                className="w-full border rounded px-3 py-2"
                value={editUser.status}
                onChange={e => setEditUser({ ...editUser, status: e.target.value })}
              >
                <option value="active">激活</option>
                <option value="inactive">禁用</option>
              </select>
              <Button className="w-full" onClick={handleUpdate}>
                保存
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
