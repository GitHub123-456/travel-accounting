// ***********************************************************
// This support file is processed and loaded automatically before
// your test files.
// ***********************************************************

import './commands';

// 全局处理未捕获异常，防止测试因应用内部错误中断
Cypress.on('uncaught:exception', (err) => {
  // 忽略 ResizeObserver 和 chunk load 错误
  if (err.message.includes('ResizeObserver') || err.message.includes('Loading chunk')) {
    return false;
  }
  return true;
});
