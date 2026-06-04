#!/usr/bin/env python3
"""
FacturaMéxico — Sistema de Facturación Electrónica CFDI 4.0
Punto de entrada principal.
"""

import sys
from pathlib import Path

# Asegurar que los módulos del proyecto se encuentran en sys.path
sys.path.insert(0, str(Path(__file__).parent))

import database as db


def main():
    # Inicializar base de datos
    db.inicializar_db()

    # Iniciar GUI
    from gui.app import App
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
