"""
模块整合脚本
将所有独立的Python模块整合到ttssreport项目中
"""

import os
import shutil
from pathlib import Path

# 定义源文件和目标文件的映射关系
FILE_MAPPINGS = {
    # 数据集成模块
    '/home/ubuntu/upload/.recovery/data_integration_core.py': 'python/data_integration/core.py',
    
    # 标签计算模块
    '/home/ubuntu/tag_calculation_engine.py': 'python/tag_calculation/engine.py',
    
    # 调度器模块
    '/home/ubuntu/upload/.recovery/scheduler.py': 'python/scheduler/scheduler.py',
    '/home/ubuntu/upload/.recovery/main.py': 'python/scheduler/main.py',
    
    # 配置文件
    '/home/ubuntu/upload/.recovery/config.py': 'python/common/config_backup.py',
}

# SQL文件映射
SQL_MAPPINGS = {
    '/home/ubuntu/create_tables_fixed.sql': 'sql/create_tables.sql',
    '/home/ubuntu/create_stock_tag_tables.sql': 'sql/create_stock_tag_tables.sql',
    '/home/ubuntu/ttssreport/create_config_tags_tables.sql': 'sql/create_config_tags_tables.sql',
    '/home/ubuntu/ttssreport/init_config_tags_data.sql': 'sql/init_config_tags_data.sql',
}

# TypeScript文件映射
TS_MAPPINGS = {
    # Schema文件
    '/home/ubuntu/ttssreport/drizzle/schema_config_tags.ts': 'drizzle/schema_config_tags.ts',
    '/home/ubuntu/schema_stock_tags.ts': 'drizzle/schema_stock_tags.ts',
    
    # 路由文件
    '/home/ubuntu/ttssreport/server/routers/configTags.ts': 'server/routers/configTags.ts',
    '/home/ubuntu/stockFilter.ts': 'server/routers/stockFilter.ts',
}

# React组件映射
REACT_MAPPINGS = {
    '/home/ubuntu/ttssreport/client/src/pages/ConfigTagsManagement.tsx': 'client/src/pages/ConfigTags/index.tsx',
    '/home/ubuntu/StockFilterView.tsx': 'client/src/pages/StockFilter/index.tsx',
}


def integrate_files():
    """整合所有文件"""
    base_dir = Path('/home/ubuntu/ttssreport')
    
    print("=== 开始整合模块 ===\n")
    
    # 1. 整合Python文件
    print("1. 整合Python文件...")
    for src, dst in FILE_MAPPINGS.items():
        src_path = Path(src)
        dst_path = base_dir / dst
        
        if src_path.exists():
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f"  ✓ {src} -> {dst}")
        else:
            print(f"  ✗ 源文件不存在: {src}")
    
    # 2. 整合SQL文件
    print("\n2. 整合SQL文件...")
    sql_dir = base_dir / 'sql'
    sql_dir.mkdir(exist_ok=True)
    
    for src, dst in SQL_MAPPINGS.items():
        src_path = Path(src)
        dst_path = base_dir / dst
        
        if src_path.exists():
            shutil.copy2(src_path, dst_path)
            print(f"  ✓ {src} -> {dst}")
        else:
            print(f"  ✗ 源文件不存在: {src}")
    
    # 3. 整合TypeScript文件
    print("\n3. 整合TypeScript文件...")
    for src, dst in TS_MAPPINGS.items():
        src_path = Path(src)
        dst_path = base_dir / dst
        
        if src_path.exists():
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f"  ✓ {src} -> {dst}")
        else:
            print(f"  ✗ 源文件不存在: {src}")
    
    # 4. 整合React组件
    print("\n4. 整合React组件...")
    for src, dst in REACT_MAPPINGS.items():
        src_path = Path(src)
        dst_path = base_dir / dst
        
        if src_path.exists():
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f"  ✓ {src} -> {dst}")
        else:
            print(f"  ✗ 源文件不存在: {src}")
    
    print("\n=== 模块整合完成 ===")


if __name__ == '__main__':
    integrate_files()
