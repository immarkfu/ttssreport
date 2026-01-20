#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置文件
请根据实际情况修改以下配置信息
"""

# ==================== Tushare API配置 ====================
TUSHARE_TOKEN = 'a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9'

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'mysql-2579b2bfcbcb-public.rds.volces.com',  # 火山云数据库主机地址
    'port': 3306,                                         # 数据库端口
    'user': 'bestismark',                                 # 数据库用户名
    'password': 'Aa123456',                               # 数据库密码
    'database': 'ttssreport'                              # 数据库名称
}

# ==================== 邮件配置 ====================
# 注意: 需要配置实际的邮箱和密码/授权码
EMAIL_CONFIG = {
    'smtp_server': 'smtp.qq.com',           # SMTP服务器地址
    'smtp_port': 587,                       # SMTP服务器端口 (587=TLS, 465=SSL)
    'from_email': 'your_email@qq.com',      # 发件人邮箱 (需要配置)
    'password': 'your_password',            # 发件人密码或授权码 (需要配置)
    'to_email': 'bestismark@126.com',       # 收件人邮箱
    'use_tls': True                         # 是否使用TLS加密 (True=TLS, False=SSL)
}

# ==================== 调度配置 ====================
SCHEDULER_CONFIG = {
    'run_time': '17:30',                    # 每天执行时间 (HH:MM格式)
    'timezone': 'Asia/Shanghai',            # 时区
    'max_retries': 3,                       # 失败重试次数
    'retry_delay': 300                      # 重试延迟(秒)
}

# ==================== 日志配置 ====================
LOG_CONFIG = {
    'log_dir': '/home/ubuntu/logs',         # 日志目录
    'log_level': 'INFO',                    # 日志级别 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
    'max_bytes': 10485760,                  # 单个日志文件最大大小 (10MB)
    'backup_count': 10                      # 保留的日志文件数量
}

# ==================== 数据集成配置 ====================
INTEGRATION_CONFIG = {
    'batch_size': 1000,                     # 批量插入大小
    'timeout': 300,                         # API调用超时时间(秒)
    'max_records_per_request': 7000,        # 单次请求最大记录数
    'enable_cache': True,                   # 是否启用缓存
    'cache_ttl': 3600                       # 缓存有效期(秒)
}

# ==================== 通知配置 ====================
NOTIFICATION_CONFIG = {
    'send_on_success': True,                # 成功时是否发送通知
    'send_on_failure': True,                # 失败时是否发送通知
    'send_on_error': True,                  # 错误时是否发送通知
    'include_details': True                 # 是否在通知中包含详细信息
}
