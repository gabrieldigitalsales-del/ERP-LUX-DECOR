@echo off
setlocal
cd /d %~dp0
title HOME ERP 2.17.3
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/NPM nao encontrado.
  echo Instale o Node.js LTS e execute novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias do HOME ERP...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)
echo Iniciando HOME ERP em http://localhost:5217
start "" http://localhost:5217
call npm run dev -- --host 0.0.0.0 --port 5217
pause
