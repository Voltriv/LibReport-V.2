@echo off
setlocal ENABLEDELAYEDEXPANSION

echo [LibReport] Windows helper using MongoDB Compass only

if not exist "Backend\.env" (
  echo.
  echo Missing Backend\.env
  echo - Copy Backend\.env.example to Backend\.env and set MONGO_URI to your Compass connection string.
  exit /b 1
)

rem Optional sanity check for MONGO_URI line presence
findstr /R /C:"^[ ]*MONGO_URI[ ]*=" "Backend\.env" >nul
if errorlevel 1 (
  echo.
  echo MONGO_URI not found in Backend\.env. Please set it to your Compass URI.
  exit /b 1
)

echo.
echo Installing dependencies (Backend, Frontend)...
call npm run setup || exit /b 1

echo.
echo Bootstrapping database (indexes + seed)...
call npm run db:bootstrap || exit /b 1

echo.
echo Starting backend and frontend (Ctrl+C to stop)...
call npm run dev

endlocal

