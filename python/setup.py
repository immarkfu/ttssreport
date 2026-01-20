"""
TTSS Report Python模块安装配置
"""

from setuptools import setup, find_packages

with open('requirements.txt') as f:
    requirements = f.read().splitlines()

setup(
    name='ttssreport-python',
    version='1.0.0',
    description='TTSS Report Python后端模块',
    author='TTSS Team',
    author_email='bestismark@126.com',
    packages=find_packages(),
    install_requires=requirements,
    python_requires='>=3.11',
    entry_points={
        'console_scripts': [
            'ttss-scheduler=scheduler.main:main',
            'ttss-integration=scripts.run_integration:main',
            'ttss-tag-calculation=scripts.run_tag_calculation:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.11',
    ],
)
