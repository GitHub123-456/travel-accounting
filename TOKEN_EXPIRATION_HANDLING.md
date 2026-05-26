# Token过期自动登出功能实现

## 实现内容

### 1. 响应拦截器优化 (`frontend/src/utils/request.js`)
- 当收到401未授权响应时：
  - 显示"登录已过期，请重新登录"提示
  - 清除localStorage中的token和userId
  - 自动跳转到登录页面

### 2. 路由守卫 (`frontend/src/App.jsx`)
- 添加`PrivateRoute`组件保护所有需要登录的路由
- 在访问受保护页面时检查token是否存在
- 如果token不存在，自动重定向到登录页

### 3. 受保护的路由
以下路由已添加路由守卫：
- `/account-books` - 账本列表
- `/account-books/:id` - 账本详情
- `/account-books/:id/transactions/new` - 新建交易
- `/account-books/:id/transactions/:transactionId/edit` - 编辑交易
- `/account-books/:id/split-bill` - 分账页面
- `/profile` - 个人中心

### 4. 手动登出功能
个人中心页面已有完整的登出功能：
- 点击"退出登录"按钮
- 弹出确认对话框
- 清除token和userId
- 跳转到登录页

## 工作流程

### Token过期场景
1. 用户发起API请求
2. 后端返回401状态码
3. 响应拦截器捕获401错误
4. 显示过期提示
5. 清除本地存储的认证信息
6. 自动跳转到登录页

### 无Token访问场景
1. 用户直接访问受保护页面
2. PrivateRoute检查localStorage中的token
3. 如果token不存在，重定向到登录页
4. 用户登录后可以正常访问

### 手动登出场景
1. 用户在个人中心点击"退出登录"
2. 确认对话框
3. 清除认证信息
4. 跳转到登录页

## 技术细节

### 清除的数据
- `localStorage.token` - JWT令牌
- `localStorage.userId` - 用户ID

### 跳转方式
- 401错误：使用`window.location.href`强制刷新页面
- 路由守卫：使用React Router的`<Navigate>`组件
- 手动登出：使用`navigate()`函数

## 测试建议

1. 等待token过期后访问任意页面，应自动跳转登录页
2. 清除localStorage后刷新页面，应跳转到登录页
3. 在个人中心点击退出登录，应正常退出
4. 登录后应能正常访问所有页面

## 注意事项

- token过期时间由后端JWT配置决定
- 所有受保护的路由都需要包裹在`PrivateRoute`中
- 登录和注册页面不需要路由守卫
