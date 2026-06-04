"""
Ventana principal de FacturaMéxico.
"""

import tkinter as tk
from tkinter import ttk

from constants import APP_NAME, APP_VERSION
from gui.config_tab import ConfigTab
from gui.perfiles_tab import PerfilesTab
from gui.registro_tab import RegistroTab
from gui.ticket_tab import TicketTab


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} v{APP_VERSION} — Gestión de CFDI 4.0")
        self.geometry("1200x800")
        self.minsize(900, 600)

        self._aplicar_estilo()
        self._construir_ui()

    def _aplicar_estilo(self):
        style = ttk.Style(self)
        # Intentar un tema más moderno si está disponible
        available = style.theme_names()
        for preferido in ("clam", "alt", "default"):
            if preferido in available:
                style.theme_use(preferido)
                break

        # Colores de acento verde mexicano
        style.configure("Accent.TButton", foreground="white", background="#006847",
                        font=("", 10, "bold"))
        style.map("Accent.TButton",
                  background=[("active", "#004d35"), ("pressed", "#003d2a")])

        style.configure("TNotebook.Tab", padding=(12, 6), font=("", 10))

    def _construir_ui(self):
        # Barra superior con logo / título
        frame_header = tk.Frame(self, bg="#006847", height=48)
        frame_header.pack(fill="x", side="top")
        frame_header.pack_propagate(False)
        tk.Label(
            frame_header,
            text=f"  🇲🇽  {APP_NAME}  —  Sistema de Facturación Electrónica CFDI 4.0",
            bg="#006847", fg="white", font=("", 12, "bold"),
        ).pack(side="left", padx=12, pady=10)

        # Notebook de pestañas
        self._nb = ttk.Notebook(self)
        self._nb.pack(fill="both", expand=True, padx=8, pady=8)

        # Pestaña Configuración (se construye primero para proveer api_key)
        self._tab_config = ConfigTab(self._nb)

        # Pestañas principales
        self._tab_perfiles = PerfilesTab(self._nb)
        self._tab_ticket = TicketTab(self._nb, get_api_key_fn=self._tab_config.get_api_key)
        self._tab_registro = RegistroTab(self._nb)

        self._nb.add(self._tab_perfiles, text="👤  Perfiles Fiscales")
        self._nb.add(self._tab_ticket, text="🧾  Nuevo Ticket")
        self._nb.add(self._tab_registro, text="📊  Registro de Facturas")
        self._nb.add(self._tab_config, text="⚙  Configuración")

        # Refrescar registro cuando se cambia de pestaña
        self._nb.bind("<<NotebookTabChanged>>", self._on_tab_change)

        # Barra de estado inferior
        self._lbl_status = tk.Label(
            self, text="Listo — CFDI 4.0 vigente (2024)  |  Miscelánea Fiscal Mexicana",
            anchor="w", relief="sunken", bd=1, font=("", 9), fg="#444"
        )
        self._lbl_status.pack(fill="x", side="bottom", padx=4, pady=(0, 4))

    def _on_tab_change(self, event):
        idx = self._nb.index(self._nb.select())
        if idx == 2:  # Registro de Facturas
            self._tab_registro.refresh()
        elif idx == 1:  # Nuevo Ticket
            self._tab_ticket.refresh()
