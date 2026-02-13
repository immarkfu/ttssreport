# 火山云短信配置说明

## 快速配置

根据 TOOLS.md 中的火山云账号信息，您需要在 `.env` 文件中添加以下配置：

```bash
# 火山云短信配置（必填，用于短信验证码）
VOLCENGINE_SMS_ACCESS_KEY=your-access-key-here
VOLCENGINE_SMS_SECRET_KEY=your-secret-key-here
VOLCENGINE_SMS_SIGN_NAME=your-sign-name-here
VOLCENGINE_SMS_TEMPLATE_ID=your-template-id-here
VOLCENGINE_SMS_ENDPOINT=https://sms.volcengineapi.com
VOLCENGINE_SMS_REGION=cn-north-1
```

## 获取 Access Key 和 Secret Key

1. 登录火山云控制台：https://console.volcengine.com
2. 点击右上角头像 -> 访问密钥（Access Key）
3. 创建或查看您的 Access Key 和 Secret Key
4. 将这两个值填入上述配置

## 创建短信签名和模板

### 1. 创建短信签名
1. 登录火山云控制台 -> 短信服务
2. 选择"短信签名"
3. 点击"创建签名"
4. 填写签名名称（如：投资分析平台）
5. 提交审核（通常 1-2 小时内完成）

### 2. 创建短信模板
1. 在短信服务中选择"短信模板"
2. 点击"创建模板"
3. 选择模板类型：验证码
4. 填写模板内容：`您的验证码是{code}，有效期5分钟，请勿泄露。`
5. 提交审核（通常 1-2 小时内完成）

### 3. 获取签名名称和模板ID
- 审核通过后，在签名列表中复制"签名名称"（不是签名内容）
- 在模板列表中复制"模板ID"

## 配置验证

配置完成后，可以通过以下方式验证：

1. 重启后端服务
2. 调用发送验证码接口：
   ```bash
   curl -X POST http://localhost:8000/api/auth/send-code \
     -H "Content-Type: application/json" \
     -d '{"phone": "13800138000"}'
   ```

3. 查看后端日志，确认：
   - ✅ 火山云短信配置已加载
   - ✅ 火山云短信发送成功

## 测试说明

在测试环境中，即使短信发送失败，验证码也会保存到数据库并在日志中打印：
```
验证码已保存到数据库: 123456 (手机: 13800138000)
```

因此您可以在测试阶段直接使用日志中打印的验证码进行验证。

## 生产环境检查清单

- [ ] Access Key 和 Secret Key 已正确配置
- [ ] 短信签名已通过审核
- [ ] 短信模板已通过审核
- [ ] 签名名称（不是签名内容）已填入配置
- [ ] 模板ID已填入配置
- [ ] 测试发送短信成功
- [ ] 验证码有效期设置正确（默认5分钟）
- [ ] 生产环境 JWT_SECRET_KEY 已修改为随机密钥
