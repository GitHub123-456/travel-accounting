@echo off
echo Starting MySQL Server...
cd /d "D:\software2\mysql-9.6.0-winx64\mysql-9.6.0-winx64\bin"
start "MySQL Server" mysqld.exe --console
echo MySQL Server is starting...
echo Please keep this window open while using the application.
pause
