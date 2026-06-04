#!/usr/bin/env bash
set -e
echo "========================================"
echo "  FacturaMéxico Web — Setup"
echo "========================================"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "Iniciando servidor..."
python main.py
