@echo off
cd /d "%~dp0"
if not exist ".env" copy "env-template.env" ".env"
docker compose up -d --build
timeout /t 3 /nobreak >nul
start msedge --app="file:///%~dp0frontend/index.html"
