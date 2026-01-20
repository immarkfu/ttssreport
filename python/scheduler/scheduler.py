#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定时调度和交易日判断模块
用于判断是否为A股交易日，并在每个交易日17:30执行数据集成任务
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, time
from typing import List, Tuple
import tushare as ts
import schedule
import time as time_module
from data_integration_core import TushareDataIntegrator
from notification import send_email_notification

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/logs/scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class TradeCalendar:
    """A股交易日历"""
    
    def __init__(self, tushare_token: str):
        """
        初始化交易日历
        
        Args:
            tushare_token: Tushare API密钥
        """
        self.tushare_token = tushare_token
        ts.set_token(tushare_token)
        self.pro = ts.pro_api()
        self.trade_dates = None
        self.last_update = None
        
    def _fetch_trade_calendar(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        从Tushare获取交易日历
        
        Args:
            start_date: 开始日期(YYYYMMDD)
            end_date: 结束日期(YYYYMMDD)
            
        Returns:
            交易日历DataFrame
        """
        try:
            logger.info(f"从Tushare获取{start_date}到{end_date}的交易日历...")
            df = self.pro.trade_cal(
                exchange='SSE',
                start_date=start_date,
                end_date=end_date,
                is_open=1  # 只获取交易日
            )
            # 确保返回的DataFrame有正确的列名
            if df is not None and len(df) > 0:
                # Tushare返回的列名可能是 'cal_date' 而不是 'trade_date'
                if 'cal_date' in df.columns and 'trade_date' not in df.columns:
                    df.rename(columns={'cal_date': 'trade_date'}, inplace=True)
            return df
        except Exception as e:
            logger.error(f"获取交易日历失败: {str(e)}")
            raise
    
    def is_trade_date(self, date_str: str) -> bool:
        """
        判断是否为交易日
        
        Args:
            date_str: 日期字符串(YYYYMMDD或YYYY-MM-DD)
            
        Returns:
            是否为交易日
        """
        try:
            # 标准化日期格式
            if '-' in date_str:
                date_str = date_str.replace('-', '')
            
            # 如果缓存的交易日历不存在或过期，重新获取
            if self.trade_dates is None or self._is_cache_expired():
                self._refresh_trade_calendar()
            
            # 检查是否在交易日列表中
            if self.trade_dates is not None and len(self.trade_dates) > 0:
                trade_date_col = 'trade_date' if 'trade_date' in self.trade_dates.columns else 'cal_date'
                return date_str in self.trade_dates[trade_date_col].values
            return False
            
        except Exception as e:
            logger.error(f"判断交易日失败: {str(e)}")
            return False
    
    def _is_cache_expired(self) -> bool:
        """检查缓存是否过期(每天更新一次)"""
        if self.last_update is None:
            return True
        return (datetime.now() - self.last_update).days >= 1
    
    def _refresh_trade_calendar(self):
        """刷新交易日历缓存"""
        try:
            # 获取过去一年和未来一年的交易日历
            today = datetime.now()
            start_date = (today - timedelta(days=365)).strftime('%Y%m%d')
            end_date = (today + timedelta(days=365)).strftime('%Y%m%d')
            
            self.trade_dates = self._fetch_trade_calendar(start_date, end_date)
            self.last_update = datetime.now()
            logger.info(f"交易日历已更新，共{len(self.trade_dates)}个交易日")
            
        except Exception as e:
            logger.error(f"刷新交易日历失败: {str(e)}")
            raise
    
    def get_last_trade_date(self, date_str: str = None) -> str:
        """
        获取指定日期之前的最后一个交易日
        
        Args:
            date_str: 参考日期(YYYYMMDD)，默认为今天
            
        Returns:
            最后一个交易日(YYYYMMDD)
        """
        try:
            if date_str is None:
                date_str = datetime.now().strftime('%Y%m%d')
            
            # 标准化日期格式
            if '-' in date_str:
                date_str = date_str.replace('-', '')
            
            # 刷新缓存
            if self.trade_dates is None:
                self._refresh_trade_calendar()
            
            # 获取小于参考日期的最后一个交易日
            trade_date_col = 'trade_date' if 'trade_date' in self.trade_dates.columns else 'cal_date'
            trade_dates_sorted = sorted(self.trade_dates[trade_date_col].values)
            for trade_date in reversed(trade_dates_sorted):
                if trade_date < date_str:
                    return trade_date
            
            return None
            
        except Exception as e:
            logger.error(f"获取最后交易日失败: {str(e)}")
            return None
    
    def get_next_trade_date(self, date_str: str = None) -> str:
        """
        获取指定日期之后的下一个交易日
        
        Args:
            date_str: 参考日期(YYYYMMDD)，默认为今天
            
        Returns:
            下一个交易日(YYYYMMDD)
        """
        try:
            if date_str is None:
                date_str = datetime.now().strftime('%Y%m%d')
            
            # 标准化日期格式
            if '-' in date_str:
                date_str = date_str.replace('-', '')
            
            # 刷新缓存
            if self.trade_dates is None:
                self._refresh_trade_calendar()
            
            # 获取大于参考日期的第一个交易日
            trade_date_col = 'trade_date' if 'trade_date' in self.trade_dates.columns else 'cal_date'
            trade_dates_sorted = sorted(self.trade_dates[trade_date_col].values)
            for trade_date in trade_dates_sorted:
                if trade_date > date_str:
                    return trade_date
            
            return None
            
        except Exception as e:
            logger.error(f"获取下一个交易日失败: {str(e)}")
            return None


class DataIntegrationScheduler:
    """数据集成调度器"""
    
    def __init__(self, tushare_token: str, db_config: dict, email_config: dict):
        """
        初始化调度器
        
        Args:
            tushare_token: Tushare API密钥
            db_config: 数据库配置
            email_config: 邮件配置
        """
        self.tushare_token = tushare_token
        self.db_config = db_config
        self.email_config = email_config
        self.trade_calendar = TradeCalendar(tushare_token)
        self.integrator = TushareDataIntegrator(tushare_token, db_config)
        
    def _get_target_date(self) -> str:
        """
        获取应该集成的交易日期
        
        Returns:
            交易日期(YYYYMMDD)
        """
        today = datetime.now().strftime('%Y%m%d')
        
        # 如果今天是交易日，则集成今天的数据
        if self.trade_calendar.is_trade_date(today):
            return today
        
        # 否则获取最后一个交易日
        last_trade_date = self.trade_calendar.get_last_trade_date(today)
        return last_trade_date
    
    def run_integration_task(self):
        """执行数据集成任务"""
        try:
            logger.info("=" * 80)
            logger.info("开始执行数据集成任务")
            logger.info("=" * 80)
            
            task_start_time = datetime.now()
            
            # 获取目标交易日期
            trade_date = self._get_target_date()
            
            if trade_date is None:
                logger.warning("无法获取有效的交易日期")
                return
            
            logger.info(f"目标交易日期: {trade_date}")
            
            # 执行数据集成
            result = self.integrator.integrate_daily_data(trade_date)
            
            # 处理结果
            bak_daily_result = result.get('bak_daily', {})
            stk_factor_result = result.get('stk_factor_pro', {})
            
            # 检查是否有错误
            bak_daily_error = bak_daily_result.get('error', '')
            stk_factor_error = stk_factor_result.get('error', '')
            
            task_end_time = datetime.now()
            duration = int((task_end_time - task_start_time).total_seconds())
            
            # 记录任务结果
            logger.info("=" * 80)
            logger.info("数据集成任务完成")
            logger.info(f"耗时: {duration}秒")
            logger.info(f"备用行情数据: {bak_daily_result.get('status', 'unknown')}")
            if bak_daily_result.get('total'):
                logger.info(f"  - 总记录数: {bak_daily_result.get('total', 0)}")
                logger.info(f"  - 插入: {bak_daily_result.get('inserted', 0)}")
                logger.info(f"  - 更新: {bak_daily_result.get('updated', 0)}")
            if bak_daily_error:
                logger.error(f"  - 错误: {bak_daily_error}")
            
            logger.info(f"技术面因子数据: {stk_factor_result.get('status', 'unknown')}")
            if stk_factor_result.get('total'):
                logger.info(f"  - 总记录数: {stk_factor_result.get('total', 0)}")
                logger.info(f"  - 插入: {stk_factor_result.get('inserted', 0)}")
                logger.info(f"  - 更新: {stk_factor_result.get('updated', 0)}")
            if stk_factor_error:
                logger.error(f"  - 错误: {stk_factor_error}")
            logger.info("=" * 80)
            
            # 如果有错误，发送邮件通知
            if bak_daily_error or stk_factor_error:
                self._send_failure_notification(trade_date, result, duration)
            else:
                self._send_success_notification(trade_date, result, duration)
            
        except Exception as e:
            logger.error(f"数据集成任务执行失败: {str(e)}")
            self._send_error_notification(str(e))
    
    def _send_success_notification(self, trade_date: str, result: dict, duration: int):
        """发送成功通知"""
        try:
            subject = f"[数据集成成功] {trade_date}"
            
            bak_daily = result.get('bak_daily', {})
            stk_factor = result.get('stk_factor_pro', {})
            
            body = f"""
数据集成任务已成功完成！

交易日期: {trade_date}
执行时间: {duration}秒

备用行情数据:
  状态: {bak_daily.get('status', 'unknown')}
  总记录数: {bak_daily.get('total', 0)}
  插入: {bak_daily.get('inserted', 0)}
  更新: {bak_daily.get('updated', 0)}

技术面因子数据:
  状态: {stk_factor.get('status', 'unknown')}
  总记录数: {stk_factor.get('total', 0)}
  插入: {stk_factor.get('inserted', 0)}
  更新: {stk_factor.get('updated', 0)}

任务完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            send_email_notification(
                to_email=self.email_config['to_email'],
                subject=subject,
                body=body,
                smtp_server=self.email_config['smtp_server'],
                smtp_port=self.email_config['smtp_port'],
                from_email=self.email_config['from_email'],
                password=self.email_config['password']
            )
            logger.info("成功通知已发送")
        except Exception as e:
            logger.error(f"发送成功通知失败: {str(e)}")
    
    def _send_failure_notification(self, trade_date: str, result: dict, duration: int):
        """发送失败通知"""
        try:
            subject = f"[数据集成失败] {trade_date}"
            
            bak_daily = result.get('bak_daily', {})
            stk_factor = result.get('stk_factor_pro', {})
            
            body = f"""
数据集成任务执行失败！

交易日期: {trade_date}
执行时间: {duration}秒

备用行情数据:
  状态: {bak_daily.get('status', 'unknown')}
  错误: {bak_daily.get('error', '无')}

技术面因子数据:
  状态: {stk_factor.get('status', 'unknown')}
  错误: {stk_factor.get('error', '无')}

请检查日志文件获取更多详情。
日志文件: /home/ubuntu/logs/

任务完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            send_email_notification(
                to_email=self.email_config['to_email'],
                subject=subject,
                body=body,
                smtp_server=self.email_config['smtp_server'],
                smtp_port=self.email_config['smtp_port'],
                from_email=self.email_config['from_email'],
                password=self.email_config['password']
            )
            logger.info("失败通知已发送")
        except Exception as e:
            logger.error(f"发送失败通知失败: {str(e)}")
    
    def _send_error_notification(self, error_msg: str):
        """发送错误通知"""
        try:
            subject = "[数据集成错误] 任务执行异常"
            
            body = f"""
数据集成任务执行出现异常！

错误信息:
{error_msg}

请立即检查日志文件获取更多详情。
日志文件: /home/ubuntu/logs/

任务完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            send_email_notification(
                to_email=self.email_config['to_email'],
                subject=subject,
                body=body,
                smtp_server=self.email_config['smtp_server'],
                smtp_port=self.email_config['smtp_port'],
                from_email=self.email_config['from_email'],
                password=self.email_config['password']
            )
            logger.info("错误通知已发送")
        except Exception as e:
            logger.error(f"发送错误通知失败: {str(e)}")
    
    def start_scheduler(self, run_time: str = "17:30"):
        """
        启动定时调度器
        
        Args:
            run_time: 执行时间(HH:MM格式)
        """
        try:
            logger.info(f"启动定时调度器，每个交易日{run_time}执行一次")
            
            # 每个交易日17:30执行任务
            schedule.every().day.at(run_time).do(self.run_integration_task)
            
            # 保持调度器运行
            while True:
                schedule.run_pending()
                time_module.sleep(60)  # 每分钟检查一次
                
        except Exception as e:
            logger.error(f"调度器启动失败: {str(e)}")
            raise
        finally:
            self.integrator.close()
    
    def run_once(self):
        """执行一次数据集成任务(用于测试)"""
        try:
            self.run_integration_task()
        finally:
            self.integrator.close()


if __name__ == '__main__':
    # 配置信息
    tushare_token = 'a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9'
    
    db_config = {
        'host': 'mysql-2579b2bfcbcb-public.rds.volces.com',
        'port': 3306,
        'user': 'bestismark',
        'password': 'Aa123456',
        'database': 'ttssreport'
    }
    
    email_config = {
        'smtp_server': 'smtp.qq.com',
        'smtp_port': 587,
        'from_email': 'your_email@qq.com',  # 需要配置
        'password': 'your_password',  # 需要配置
        'to_email': 'bestismark@126.com'
    }
    
    # 创建调度器
    scheduler = DataIntegrationScheduler(tushare_token, db_config, email_config)
    
    # 测试：执行一次任务
    scheduler.run_once()
    
    # 启动定时调度
    # scheduler.start_scheduler(run_time="17:30")
