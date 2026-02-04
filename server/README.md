# ttssreport的后端服务
整体使用fastapi的web风格进行开发

## 项目快速启动需求
1.找到这个core/config.py，填充里面的MYSQL数据库地址、端口号、名称、密码、tushare的token
2.使用test目录下的test_b1_sign脚本可以计算某个交易日的B1买点、而test/test_basic_data脚本则是可以对tushare一方的定时任务数据进行落库