"""
邮件通知模块
用于发送数据集成结果通知
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional, List
from datetime import datetime

from .config import config

logger = logging.getLogger(__name__)


class EmailNotification:
    """邮件通知类"""
    
    def __init__(self, smtp_config: Optional[dict] = None):
        """
        初始化邮件通知
        
        Args:
            smtp_config: SMTP配置字典，如果为None则使用全局配置
        """
        self.smtp_config = smtp_config or config.get_smtp_config()
    
    def send(
        self,
        subject: str,
        body: str,
        to_emails: Optional[List[str]] = None,
        html: bool = False
    ) -> bool:
        """
        发送邮件
        
        Args:
            subject: 邮件主题
            body: 邮件正文
            to_emails: 收件人列表，如果为None则使用配置中的默认收件人
            html: 是否为HTML格式
            
        Returns:
            是否发送成功
        """
        try:
            # 验证必要参数
            if not self.smtp_config.get('user') or not self.smtp_config.get('password'):
                logger.warning("邮件配置不完整，跳过发送")
                return False
            
            # 收件人列表
            if to_emails is None:
                to_emails = [self.smtp_config.get('to')]
            
            # 创建邮件
            msg = MIMEMultipart()
            msg['From'] = formataddr(('TTSS Report', self.smtp_config.get('from')))
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # 添加邮件正文
            content_type = 'html' if html else 'plain'
            msg.attach(MIMEText(body, content_type, 'utf-8'))
            
            # 连接SMTP服务器并发送
            logger.info(f"正在连接SMTP服务器: {self.smtp_config.get('host')}:{self.smtp_config.get('port')}")
            
            if self.smtp_config.get('use_ssl'):
                # 使用SSL加密连接
                server = smtplib.SMTP_SSL(
                    self.smtp_config.get('host'),
                    self.smtp_config.get('port')
                )
            else:
                # 使用TLS加密连接
                server = smtplib.SMTP(
                    self.smtp_config.get('host'),
                    self.smtp_config.get('port')
                )
                server.starttls()
            
            # 登录
            logger.info(f"正在登录邮箱: {self.smtp_config.get('user')}")
            server.login(
                self.smtp_config.get('user'),
                self.smtp_config.get('password')
            )
            
            # 发送邮件
            logger.info(f"正在发送邮件到: {', '.join(to_emails)}")
            server.send_message(msg)
            
            # 关闭连接
            server.quit()
            
            logger.info("邮件发送成功")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"邮箱认证失败: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP错误: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"发送邮件失败: {str(e)}")
            return False
    
    def send_data_integration_result(
        self,
        trade_date: str,
        success: bool,
        bak_daily_count: int = 0,
        stk_factor_count: int = 0,
        tag_count: int = 0,
        error_message: str = None
    ) -> bool:
        """
        发送数据集成结果通知
        
        Args:
            trade_date: 交易日期
            success: 是否成功
            bak_daily_count: 备用行情数据条数
            stk_factor_count: 技术面因子数据条数
            tag_count: 标签计算结果条数
            error_message: 错误信息
            
        Returns:
            是否发送成功
        """
        status = "成功" if success else "失败"
        subject = f"[TTSS Report] 数据集成{status} - {trade_date}"
        
        if success:
            body = f"""
数据集成任务执行成功

交易日期: {trade_date}
执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

数据统计:
- 备用行情数据: {bak_daily_count} 条
- 技术面因子数据: {stk_factor_count} 条
- 标签计算结果: {tag_count} 条

系统运行正常。
"""
        else:
            body = f"""
数据集成任务执行失败

交易日期: {trade_date}
执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

错误信息:
{error_message or '未知错误'}

请及时检查系统日志并处理。
"""
        
        return self.send(subject, body)
    
    def send_tag_calculation_result(
        self,
        trade_date: str,
        success: bool,
        tag_count: int = 0,
        stock_count: int = 0,
        error_message: str = None
    ) -> bool:
        """
        发送标签计算结果通知
        
        Args:
            trade_date: 交易日期
            success: 是否成功
            tag_count: 标签数量
            stock_count: 股票数量
            error_message: 错误信息
            
        Returns:
            是否发送成功
        """
        status = "成功" if success else "失败"
        subject = f"[TTSS Report] 标签计算{status} - {trade_date}"
        
        if success:
            body = f"""
标签计算任务执行成功

交易日期: {trade_date}
执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

计算统计:
- 计算标签数: {tag_count} 个
- 处理股票数: {stock_count} 只
- 生成结果数: {tag_count * stock_count} 条

系统运行正常。
"""
        else:
            body = f"""
标签计算任务执行失败

交易日期: {trade_date}
执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

错误信息:
{error_message or '未知错误'}

请及时检查系统日志并处理。
"""
        
        return self.send(subject, body)


# 创建全局邮件通知实例
email_notification = EmailNotification()


def send_notification(subject: str, body: str, to_emails: Optional[List[str]] = None) -> bool:
    """
    发送邮件通知（便捷函数）
    
    Args:
        subject: 邮件主题
        body: 邮件正文
        to_emails: 收件人列表
        
    Returns:
        是否发送成功
    """
    return email_notification.send(subject, body, to_emails)


if __name__ == '__main__':
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 测试邮件发送
    print("=== 测试邮件通知 ===")
    
    # 测试简单通知
    result = send_notification(
        subject='[测试] TTSS Report 邮件通知',
        body='这是一封测试邮件，用于验证邮件通知功能是否正常工作。'
    )
    
    if result:
        print("✓ 测试邮件发送成功")
    else:
        print("✗ 测试邮件发送失败（可能是邮件配置不完整）")
    
    # 测试数据集成结果通知
    result = email_notification.send_data_integration_result(
        trade_date='20240120',
        success=True,
        bak_daily_count=5000,
        stk_factor_count=5000,
        tag_count=30000
    )
    
    if result:
        print("✓ 数据集成结果通知发送成功")
    else:
        print("✗ 数据集成结果通知发送失败")
