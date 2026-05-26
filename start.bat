@echo off
chcp 65001 >nul
echo ========================================
echo     旅行记账系统 - 启动脚本
echo ========================================
echo.

REM 启动 MySQL
echo [1/3] 正在启动 MySQL...
net start MySQL
if %errorlevel% neq 0 (
    echo MySQL 可能已经启动或启动失败，继续下一步...
)
timeout /t 2 /nobreak >nul

REM 启动后端
echo [2/3] 正在启动后端服务...
cd /d "%~dp0backend"
start "后端服务" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

REM 启动前端
echo [3/3] 正在启动前端服务...
cd /d "%~dp0frontend"
start "前端服务" cmd /k "npm run dev"

echo.
echo ========================================
echo     所有服务已启动！
echo ========================================
echo.
echo   前端: http://localhost:5173
echo   后端: http://localhost:3000
echo.
echo   按任意键退出...
pause >nul
