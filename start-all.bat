@echo off
chcp 65001 >nul
echo ========================================
echo   旅行记账系统 - 一键启动
echo ========================================

echo.
echo [1/3] 启动 MySQL 数据库...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL%==0 (
    echo MySQL 已在运行，跳过启动。
) else (
    start "" "D:\software2\mysql-9.6.0-winx64\mysql-9.6.0-winx64\bin\mysqld.exe"
    echo MySQL 启动中，等待 3 秒...
    timeout /t 3 /nobreak >nul
    echo MySQL 已启动。
)

echo.
echo [2/3] 启动后端服务 (port 3000)...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo [3/3] 启动前端服务 (port 5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   全部服务已启动！
echo   前端: http://localhost:5173
echo   后端: http://localhost:3000
echo ========================================
pause
