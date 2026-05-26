@echo off
chcp 65001 >nul
echo ========================================
echo     旅行记账系统 - 停止脚本
echo ========================================
echo.

REM 停止 MySQL
echo [1/3] 正在停止 MySQL...
net stop MySQL
echo.

REM 停止后端（关闭窗口）
echo [2/3] 正在停止后端服务...
taskkill /FI "WINDOWTITLE eq 后端服务" /T /F 2>nul
echo.

REM 停止前端（关闭窗口）
echo [3/3] 正在停止前端服务...
taskkill /FI "WINDOWTITLE eq 前端服务" /T /F 2>nul
echo.

echo ========================================
echo     所有服务已停止！
echo ========================================
echo.
echo   按任意键退出...
pause >nul
