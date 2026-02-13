from core.config import settings
from volcengine.sms.SmsService import SmsService

def send_sms(phone: str, code: str) -> bool:
    """
    对接火山云短信服务，发送验证码
    :param phone: 目标手机号
    :param code: 生成的6位验证码
    :return: 发送成功返回True，失败返回False
    """
    try:
        # 检查配置
        if not all([
            settings.VOLCENGINE_SMS_ACCESS_KEY,
            settings.VOLCENGINE_SMS_SECRET_KEY,
            settings.VOLCENGINE_SMS_SIGN_NAME,
            settings.VOLCENGINE_SMS_TEMPLATE_ID
        ]):
            print(f"【火山云短信配置缺失】请检查环境变量配置")
            return False

        # 1. 初始化火山云短信服务客户端
        sms_service = SmsService()
        # 2. 配置认证信息（从环境变量读取）
        sms_service.set_ak(settings.VOLCENGINE_SMS_ACCESS_KEY)
        sms_service.set_sk(settings.VOLCENGINE_SMS_SECRET_KEY)
        sms_service.set_endpoint(settings.VOLCENGINE_SMS_ENDPOINT)
        sms_service.set_region(settings.VOLCENGINE_SMS_REGION)

        # 3. 构造请求参数
        # 模板参数：需与短信模板的变量名对应（如模板是"您的验证码是{code}，有效期5分钟"，则key为"code"）
        template_param = {
            "code": code
        }
        # 4. 发送短信（单条发送）
        req = {
            "SmsAccount": "smsAccount",  # 短信账号，若无特殊配置填"smsAccount"即可
            "SignName": settings.VOLCENGINE_SMS_SIGN_NAME,
            "TemplateId": settings.VOLCENGINE_SMS_TEMPLATE_ID,
            "PhoneNumbers": phone,  # 单个手机号，批量发送可传数组如["13800138000", "13900139000"]
            "TemplateParam": template_param,
            "SessionContext": ""  # 透传字段，可选，如用户ID等
        }
        # 5. 发起请求
        resp = sms_service.send_sms(req)
        # 6. 解析响应结果（以火山云官方返回字段为准）
        if resp.get("ResponseMetadata", {}).get("Error") is None:
            # 发送成功
            print(f"【火山云短信发送成功】手机号：{phone}，验证码：{code}")
            return True
        else:
            # 发送失败，打印错误信息
            error = resp["ResponseMetadata"]["Error"]
            print(f"【火山云短信发送失败】错误码：{error['Code']}，错误信息：{error['Message']}")
            return False
    except Exception as e:
        print(f"【火山云短信发送异常】{str(e)}")
        return False
