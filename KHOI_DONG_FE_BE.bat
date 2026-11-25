@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "FE_DIR=%~dp0"
for %%I in ("%~dp0..\phancong") do set "BE_DIR=%%~fI"

if /i "%~1"=="--fe" goto run_fe
if /i "%~1"=="--be" goto run_be

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua tim thay Node.js. Hay cai Node.js roi mo lai file nay.
  goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua tim thay npm.cmd trong PATH.
  goto failed
)
if not exist "%FE_DIR%package.json" (
  echo [LOI] Hay dat file nay trong thu muc fe-phancong.
  goto failed
)
if not exist "%BE_DIR%\package.json" (
  echo [LOI] Khong tim thay thu muc phancong nam canh fe-phancong.
  goto failed
)
if not exist "%BE_DIR%\.env" (
  echo [LOI] Backend thieu file phancong\.env de cau hinh MongoDB va API.
  goto failed
)

if /i "%~1"=="--check" (
  echo [OK] Node.js, npm va hai thu muc du an da san sang.
  echo FE: "%FE_DIR%"
  echo BE: "%BE_DIR%"
  exit /b 0
)

echo Dang mo backend va frontend trong hai cua so rieng...
start "PHANCONG - Backend" /D "%BE_DIR%" "%ComSpec%" /d /k ""%~f0" --be"
start "PHANCONG - Frontend" /D "%FE_DIR%" "%ComSpec%" /d /k ""%~f0" --fe"
echo Frontend mac dinh: https://localhost:5173
echo Backend mac dinh:  http://localhost:3000
echo Cho thong bao Vite ready va ket noi MongoDB thanh cong.
echo Lan dau co the can thoi gian cai thu vien.
echo Dung server: nhan Ctrl+C trong tung cua so.
exit /b 0

:run_fe
title PHANCONG - Frontend
cd /d "%FE_DIR%"
if errorlevel 1 goto failed
echo === FRONTEND ===
if not exist "node_modules\.bin\vite.cmd" goto install_fe
node -e "const p=require('./package.json'); const v=require('./node_modules/vite/package.json').version; if (/^[0-9]/.test(p.devDependencies.vite) && v!==p.devDependencies.vite) process.exit(1)" >nul 2>&1
if errorlevel 1 goto install_fe
goto start_fe

:install_fe
call :install_dependencies
if errorlevel 1 goto failed

:start_fe
echo Dang khoi dong FE...
call npm.cmd run dev
exit /b %errorlevel%

:run_be
title PHANCONG - Backend
cd /d "%BE_DIR%"
if errorlevel 1 goto failed
echo === BACKEND ===
if exist "node_modules\.bin\nodemon.cmd" goto start_be
call :install_dependencies
if errorlevel 1 goto failed

:start_be
echo Dang khoi dong BE...
call npm.cmd run dev
exit /b %errorlevel%

:install_dependencies
echo Dang cai thu vien, vui long cho...
if exist "package-lock.json" (
  call npm.cmd ci --include=dev
) else (
  call npm.cmd install --include=dev
)
exit /b %errorlevel%

:failed
echo [LOI] Khong the khoi dong. Hay xem thong bao phia tren.
if /i "%~1"=="--check" exit /b 1
pause
exit /b 1
