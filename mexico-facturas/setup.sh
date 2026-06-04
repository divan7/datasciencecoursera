#!/usr/bin/env bash
# setup.sh — Instalación de FacturaMéxico
set -e

echo "========================================"
echo "  FacturaMéxico — Setup"
echo "========================================"

# Verificar Python 3.8+
python3 --version || { echo "ERROR: Python 3 no encontrado."; exit 1; }

# Crear entorno virtual
if [ ! -d ".venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv .venv
fi

# Activar entorno
source .venv/bin/activate

# Instalar dependencias
echo "Instalando dependencias Python..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Instalar navegador Chromium para Playwright
echo "Instalando Chromium para automatización web..."
playwright install chromium
playwright install-deps chromium 2>/dev/null || true

echo ""
echo "========================================"
echo "  ✓ Instalación completa"
echo "========================================"
echo ""
echo "Para ejecutar la aplicación:"
echo "  source .venv/bin/activate"
echo "  python main.py"
echo ""
echo "IMPORTANTE: Configura tu API Key de Anthropic"
echo "en la pestaña 'Configuración' al abrir la app."
echo "Obtén tu clave en: https://console.anthropic.com"
echo ""
