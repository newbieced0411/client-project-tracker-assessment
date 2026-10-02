@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  echo Download it from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm is required but was not found.
  echo Run: corepack enable
  echo Then double-click this file again.
  pause
  exit /b 1
)

echo Installing dependencies...
call pnpm install --frozen-lockfile
if errorlevel 1 goto :failed

echo.
echo Starting Folio...
echo Open http://localhost:5173 in your browser.
echo Keep this window open while using the application.
echo.
call pnpm dev
exit /b %errorlevel%

:failed
echo.
echo Setup failed. Review the error above, then try again.
pause
exit /b 1
