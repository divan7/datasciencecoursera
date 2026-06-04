@echo off
echo ========================================
echo   FacturaMexico - Setup para Windows
echo ========================================

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no encontrado.
    echo Descargalo en https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Creando entorno virtual...
python -m venv .venv

echo Activando entorno virtual...
call .venv\Scripts\activate.bat

echo Instalando dependencias...
.venv\Scripts\python.exe -m pip install --upgrade pip --quiet 2>nul
.venv\Scripts\python.exe -m pip install -r requirements.txt

echo Instalando Chromium para automatizacion web...
.venv\Scripts\playwright.exe install chromium

echo.
echo ========================================
echo   Instalacion completa
echo ========================================
echo.
echo Ejecutando FacturaMexico...
.venv\Scripts\python.exe main.py

pause
