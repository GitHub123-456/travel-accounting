# 测试计划文档

## 1. 测试范围

本测试计划覆盖旅行记账系统的所有核心功能模块，包括：
- 用户认证（注册、登录、密码重置、邮箱直接重置密码）
- 账本管理（CRUD、封存）
- 成员管理（添加、编辑、删除）
- 汇率管理（设置、更新）
- 交易管理（手动记账、编辑、删除）
- 交易权限（成员编辑/删除权限）
- 分账结算（计算、结清标记）
- 统计分析（分类统计、币种统计）
- 个人中心（信息编辑、头像上传）

- 金额精度（小数计算准确性）
- 封存限制（只读状态验证）
- 多用户隔离（数据权限）

## 2. 测试策略

### 2.1 测试层级
| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| E2E UI 测试 | Python + Playwright | 完整用户流程 |
| API 接口测试 | Python requests | 后端接口逻辑 |
| 集成测试 | Playwright | 前后端联调 |

### 2.2 测试方法
- **正向测试**：验证正常流程能正确完成
- **反向测试**：验证异常输入能正确拒绝
- **边界测试**：验证边界值处理（金额精度、空值等）
- **权限测试**：验证数据隔离和访问控制

### 2.3 测试数据策略
- 使用独立测试用户（pytest@test.com）
- 每个测试用例创建独立数据，测试后自动清理
- 通过 API 预置测试数据，减少 UI 操作依赖

## 3. 测试环境

| 项目 | 配置 |
|------|------|
| 操作系统 | macOS / Linux |
| 浏览器 | Chrome（移动端视口 375×812） |
| 前端服务 | http://localhost:5173 |
| 后端服务 | http://localhost:3000 |
| 数据库 | MySQL 8.0（测试库） |
| Python | 3.9+ |
| Node.js | 18+ |

## 4. 自动化测试框架

### 4.1 技术栈
- **语言**：Python 3.9+
- **测试框架**：pytest
- **浏览器自动化**：Playwright
- **HTTP 请求**：requests（API 辅助）
- **报告生成**：pytest-html / 自定义 HTML 报告

### 4.2 项目结构
```
e2e-tests/
├── conftest.py              # 公共 fixtures 和辅助函数
├── test_01_auth.py          # 认证模块测试
├── test_02_account_book.py  # 账本模块测试
├── test_03_participant.py   # 成员模块测试
├── test_04_exchange_rate.py # 汇率模块测试
├── test_05_transaction.py   # 交易模块测试
├── test_06_split_bill.py    # 分账模块测试
├── test_07_statistics.py    # 统计模块测试
├── test_08_profile.py       # 个人中心测试
├── test_09_money_accuracy.py # 金额精度测试
├── test_10_archived_book.py # 封存限制测试
├── test_11_multi_user.py    # 多用户测试
├── generate_report.py       # 报告生成脚本
└── screenshots/             # 失败截图目录
```

### 4.3 核心 Fixtures
```python
@pytest.fixture(scope="session")
def auth():
    """Session 级别认证，确保测试用户存在"""

@pytest.fixture
def logged_in_page(page, auth):
    """已登录的浏览器页面"""

@pytest.fixture
def book(auth):
    """创建测试账本，测试后自动清理"""
```

### 4.4 辅助函数
```python
def ensure_test_user()        # 确保测试用户存在
def create_account_book()     # API 创建账本
def add_participant()         # API 添加成员
def set_exchange_rate()       # API 设置汇率
def create_transaction()      # API 创建交易
def delete_account_book()     # API 删除账本
```

## 5. 测试用例清单

### 5.1 认证模块 (test_01_auth.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| AUTH-001 | 邮箱注册成功 | P0 |
| AUTH-002 | 重复邮箱注册失败 | P0 |
| AUTH-003 | 邮箱登录成功 | P0 |
| AUTH-004 | 错误密码登录失败 | P0 |
| AUTH-005 | 未注册账号登录失败 | P1 |
| AUTH-006 | 登录后跳转首页 | P0 |
| AUTH-007 | 退出登录清除 Token | P1 |
| AUTH-008 | 无 Token 访问受保护页面跳转登录 | P0 |
| AUTH-009 | 邮箱直接重置密码成功 | P0 |
| AUTH-010 | 未注册邮箱重置密码失败 | P1 |
| AUTH-011 | 密码长度不足6位重置失败 | P1 |
| AUTH-012 | 忘记密码弹窗正常弹出和关闭 | P1 |

### 5.2 账本模块 (test_02_account_book.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| BOOK-001 | 创建账本成功 | P0 |
| BOOK-002 | 账本列表展示 | P0 |
| BOOK-003 | 搜索账本 | P1 |
| BOOK-004 | 编辑账本信息 | P1 |
| BOOK-005 | 删除账本 | P1 |
| BOOK-006 | 账本详情展示 | P0 |
| BOOK-007 | 上传账本封面 | P2 |

### 5.3 成员模块 (test_03_participant.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| PART-001 | 添加参与人 | P0 |
| PART-002 | 编辑参与人姓名 | P1 |
| PART-003 | 删除参与人 | P1 |
| PART-004 | 参与人列表展示 | P0 |
| PART-005 | 重复姓名参与人处理 | P2 |

### 5.4 汇率模块 (test_04_exchange_rate.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| RATE-001 | 设置新币种汇率 | P0 |
| RATE-002 | 更新已有汇率 | P0 |
| RATE-003 | 汇率列表展示 | P1 |
| RATE-004 | 汇率变更后交易金额重算 | P0 |
| RATE-005 | 无效汇率值拒绝 | P1 |

### 5.5 交易模块 (test_05_transaction.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| TXN-001 | 创建个人账单 | P0 |
| TXN-002 | 创建共同账单 | P0 |
| TXN-003 | 交易列表展示 | P0 |
| TXN-004 | 编辑交易 | P1 |
| TXN-005 | 删除交易 | P1 |
| TXN-006 | 外币交易自动换算本币 | P0 |
| TXN-007 | 交易分类筛选 | P2 |
| TXN-008 | 指定付款人和参与人 | P0 |
| TXN-009 | 账本成员可编辑他人创建的交易 | P0 |
| TXN-010 | 账本成员可删除他人创建的交易 | P0 |

### 5.6 分账模块 (test_06_split_bill.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| SPLIT-001 | 两人均摊计算正确 | P0 |
| SPLIT-002 | 多人均摊计算正确 | P0 |
| SPLIT-003 | 多笔共同账单累计分账 | P0 |
| SPLIT-004 | 标记参与人已结清 | P1 |
| SPLIT-005 | 无共同账单时分账为零 | P1 |
| SPLIT-006 | 个人分账视图展示 | P1 |

### 5.7 统计模块 (test_07_statistics.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| STAT-001 | 总支出统计正确 | P0 |
| STAT-002 | 分类统计正确 | P1 |
| STAT-003 | 币种统计正确 | P1 |
| STAT-004 | 个人/共同支出分别统计 | P1 |

### 5.8 个人中心模块 (test_08_profile.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| PROF-001 | 查看个人信息 | P0 |
| PROF-002 | 修改昵称 | P1 |
| PROF-003 | 上传头像 | P1 |
| PROF-004 | 修改默认本币 | P2 |
| PROF-005 | 退出登录 | P0 |

### 5.9 金额精度模块 (test_09_money_accuracy.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| MONEY-001 | 小数金额存储精度 | P0 |
| MONEY-002 | 汇率换算精度 | P0 |
| MONEY-003 | 分账均摊精度（除不尽场景） | P0 |
| MONEY-004 | 大金额计算不溢出 | P1 |
| MONEY-005 | 零金额处理 | P1 |

### 5.10 封存限制模块 (test_10_archived_book.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| ARCH-001 | 封存账本成功 | P0 |
| ARCH-002 | 封存后不能新增交易 | P0 |
| ARCH-003 | 封存后不能编辑交易 | P0 |
| ARCH-004 | 封存后不能删除交易 | P0 |
| ARCH-005 | 封存后不能添加成员 | P0 |
| ARCH-006 | 封存后不能修改汇率 | P0 |
| ARCH-007 | 解除封存后恢复编辑 | P1 |
| ARCH-008 | 封存状态 UI 标识正确 | P1 |

### 5.11 多用户模块 (test_11_multi_user.py)

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| MULTI-001 | 用户只能看到自己的账本 | P0 |
| MULTI-002 | 用户不能访问他人账本 | P0 |
| MULTI-003 | 用户不能修改他人数据 | P0 |
| MULTI-004 | 不同用户同名账本互不影响 | P1 |



### 5.13 预算展示模块

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| BUDGET-001 | 人均预算正确计算（总预算/成员数） | P0 |
| BUDGET-002 | 进度条显示当前用户消费占比 | P1 |
| BUDGET-003 | 无成员时预算展示为总预算 | P1 |
| BUDGET-004 | 超出预算时进度条变色提醒 | P2 |

## 6. 运行方式

### 6.1 环境准备
```bash
# 安装 Python 依赖
cd e2e-tests
pip install pytest playwright requests pytest-html

# 安装浏览器
playwright install chromium

# 确保前后端服务已启动
# 后端: cd backend && npm run dev
# 前端: cd frontend && npm run dev
```

### 6.2 运行全部测试
```bash
cd e2e-tests
pytest --headed --slow-mo=800
```

### 6.3 运行单个模块
```bash
# 只运行认证测试
pytest test_01_auth.py -v

# 只运行分账测试
pytest test_06_split_bill.py -v
```

### 6.4 生成测试报告
```bash
# HTML 报告
pytest --html=report.html --self-contained-html

# 自定义报告
python generate_report.py
```

### 6.5 失败截图
- 测试失败时自动截图保存到 `screenshots/` 目录
- 截图文件名包含测试用例路径，便于定位问题

### 6.6 CI/CD 集成
```bash
# 无头模式运行（CI 环境）
pytest --headless -v --tb=short
```
