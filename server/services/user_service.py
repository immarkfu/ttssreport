import random
import string
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from core.config import settings
from core.security import create_access_token, verify_token
from services.smsService import send_sms

class UserService:
    def __init__(self, db):
        self.db = db

    async def send_verification_code(self, phone: str) -> bool:
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.now() + timedelta(minutes=5)

        # 先保存验证码到数据库
        async with self.db.cursor() as cursor:
            query = """
            INSERT INTO phone_verification_codes (phone, code, expires_at)
            VALUES (%s, %s, %s)
            """
            await cursor.execute(query, (phone, code, expires_at))
            await self.db.commit()

        # 调用火山云短信服务发送验证码
        try:
            success = send_sms(phone, code)
            if success:
                print(f"【验证码发送成功】手机号：{phone}")
                return True
            else:
                print(f"【验证码发送失败】手机号：{phone}，验证码：{code}")
                # 即使发送失败，验证码也已保存到数据库，可用于测试
                print(f"验证码已保存到数据库: {code} (手机: {phone})")
                return False
        except Exception as e:
            print(f"【验证码发送异常】{str(e)}")
            print(f"验证码已保存到数据库: {code} (手机: {phone})")
            return False

    async def verify_code(self, phone: str, code: str) -> bool:
        async with self.db.cursor() as cursor:
            query = """
            SELECT id FROM phone_verification_codes
            WHERE phone = %s AND code = %s
            AND expires_at > %s AND used = FALSE
            ORDER BY created_at DESC LIMIT 1
            """
            await cursor.execute(query, (phone, code, datetime.now()))
            result = await cursor.fetchone()

            if result:
                update_query = "UPDATE phone_verification_codes SET used = TRUE WHERE id = %s"
                await cursor.execute(update_query, (result[0],))
                await self.db.commit()
                return True
        return False

    async def register(self, phone: str, code: str, username: Optional[str] = None) -> Optional[dict]:
        if not await self.verify_code(phone, code):
            return None

        async with self.db.cursor() as cursor:
            check_query = "SELECT id FROM users WHERE phone = %s"
            await cursor.execute(check_query, (phone,))
            existing = await cursor.fetchone()
            if existing:
                return None

            username = username or f"user_{phone[-4:]}"
            query = """
            INSERT INTO users (phone, username, role)
            VALUES (%s, %s, 'comm')
            """
            await cursor.execute(query, (phone, username))
            await self.db.commit()
            user_id = cursor.lastrowid

            await cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            row = await cursor.fetchone()
            await cursor.execute("DESC users")
            columns = [col[0] for col in await cursor.fetchall()]
            user = dict(zip(columns, row))

        await self._copy_admin_tags(user_id)
        return user

    async def _copy_admin_tags(self, user_id: int):
        try:
            async with self.db.cursor() as cursor:
                await cursor.execute("""
                    INSERT INTO strategy_strategy_config_tags (
                        user_id, tag_name, tag_code, strategy_type, category,
                        meaning, is_enabled, is_filter, threshold_value, sort_order
                    )
                    SELECT %s, tag_name, tag_code, strategy_type, category,
                           meaning, is_enabled, is_filter, threshold_value, sort_order
                    FROM strategy_config_tags
                    WHERE user_id = 1
                """, (user_id,))
                await self.db.commit()
                print(f"已为用户 {user_id} 复制管理员标签配置")
        except Exception as e:
            print(f"复制管理员标签配置失败: {e}")

    async def login_by_phone(self, phone: str, code: str) -> Optional[dict]:
        if not await self.verify_code(phone, code):
            return None

        async with self.db.cursor() as cursor:
            query = "SELECT * FROM users WHERE phone = %s AND status = 'active'"
            await cursor.execute(query, (phone,))
            row = await cursor.fetchone()

            if row:
                await cursor.execute("DESC users")
                columns = [col[0] for col in await cursor.fetchall()]
                user = dict(zip(columns, row))
                token = create_access_token({"sub": str(user['id']), "role": user['role']})
                return {"user": user, "token": token}
        return None

    async def get_wechat_access_token(self, code: str) -> Optional[dict]:
        url = "https://api.weixin.qq.com/sns/oauth2/access_token"
        params = {
            "appid": settings.WECHAT_APP_ID,
            "secret": settings.WECHAT_APP_SECRET,
            "code": code,
            "grant_type": "authorization_code"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    return data
        return None

    async def get_wechat_userinfo(self, access_token: str, openid: str) -> Optional[dict]:
        url = "https://api.weixin.qq.com/sns/userinfo"
        params = {
            "access_token": access_token,
            "openid": openid,
            "lang": "zh_CN"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                return response.json()
        return None

    async def login_by_wechat(self, code: str) -> Optional[dict]:
        token_data = await self.get_wechat_access_token(code)
        if not token_data:
            return None

        openid = token_data.get("openid")
        access_token = token_data.get("access_token")

        userinfo = await self.get_wechat_userinfo(access_token, openid)
        nickname = userinfo.get("nickname", f"wx_{openid[-6:]}") if userinfo else f"wx_{openid[-6:]}"

        async with self.db.cursor() as cursor:
            query = "SELECT * FROM users WHERE wechat_openid = %s AND status = 'active'"
            await cursor.execute(query, (openid,))
            row = await cursor.fetchone()

            if not row:
                insert_query = """
                INSERT INTO users (wechat_openid, username, role)
                VALUES (%s, %s, 'comm')
                """
                await cursor.execute(insert_query, (openid, nickname))
                await self.db.commit()
                user_id = cursor.lastrowid
                await cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                row = await cursor.fetchone()

            await cursor.execute("DESC users")
            columns = [col[0] for col in await cursor.fetchall()]
            user = dict(zip(columns, row))
            token = create_access_token({"sub": str(user['id']), "role": user['role']})
            return {"user": user, "token": token}

    async def get_users(self, skip: int = 0, limit: int = 100) -> List[dict]:
        async with self.db.cursor() as cursor:
            query = "SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s"
            await cursor.execute(query, (limit, skip))
            rows = await cursor.fetchall()
            await cursor.execute("DESC users")
            columns = [col[0] for col in await cursor.fetchall()]
            return [dict(zip(columns, row)) for row in rows]

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        async with self.db.cursor() as cursor:
            query = "SELECT * FROM users WHERE id = %s"
            await cursor.execute(query, (user_id,))
            row = await cursor.fetchone()
            if row:
                await cursor.execute("DESC users")
                columns = [col[0] for col in await cursor.fetchall()]
                return dict(zip(columns, row))
        return None

    async def update_user(self, user_id: int, **kwargs) -> Optional[dict]:
        fields = []
        values = []

        for key, value in kwargs.items():
            if value is not None and key in ['username', 'role', 'status']:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return None

        values.append(user_id)
        async with self.db.cursor() as cursor:
            query = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"
            await cursor.execute(query, tuple(values))
            await self.db.commit()

            if cursor.rowcount > 0:
                await cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                row = await cursor.fetchone()
                await cursor.execute("DESC users")
                columns = [col[0] for col in await cursor.fetchall()]
                return dict(zip(columns, row))
        return None

    async def delete_user(self, user_id: int) -> bool:
        async with self.db.cursor() as cursor:
            query = "DELETE FROM users WHERE id = %s"
            await cursor.execute(query, (user_id,))
            await self.db.commit()
            return cursor.rowcount > 0
