@echo off
echo ========================================
echo   FacturaMexico Web - Setup Windows
echo ========================================

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no encontrado.
    echo Descargalo en https://www.python.org/downloads/
    pause
    exit /b 1
)

if not exist .venv (
    echo Creando entorno virtual...
    python -m venv .venv
)

echo Instalando dependencias...
.venv\Scripts\python.exe -m pip install --upgrade pip --quiet 2>nul
.venv\Scripts\python.exe -m pip install -r requirements.txt

echo.
echo ========================================
echo   Iniciando FacturaMexico Web...
echo ========================================
echo.
echo  Abre en tu navegador:
echo    Computadora: http://localhost:8000
echo.
echo  Para usar desde el CELULAR (misma WiFi):
echo    La IP local aparecera en la consola.
echo.
echo  Presiona Ctrl+C para detener.
echo ========================================
echo.
.venv\Scripts\python.exe main.py
pause
