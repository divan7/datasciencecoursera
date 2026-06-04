"""
Pestaña de configuración de la aplicación.
"""

import json
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

from constants import APP_CONFIG_DIR, APP_NAME


CONFIG_FILE = APP_CONFIG_DIR / "config.json"

_DEFAULTS = {
    "api_key": "",
    "navegador": "chromium",
    "email_notificaciones": "",
}


def cargar_config() -> dict:
    APP_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, encoding="utf-8") as f:
                data = json.load(f)
            return {**_DEFAULTS, **data}
        except Exception:
            pass
    return dict(_DEFAULTS)


def guardar_config(cfg: dict) -> None:
    APP_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


class ConfigTab(ttk.Frame):
    def __init__(self, parent: ttk.Notebook):
        super().__init__(parent, padding=20)
        self._cfg = cargar_config()
        self._construir_ui()

    def _construir_ui(self):
        ttk.Label(self, text="Configuración", font=("", 14, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 16)
        )

        # ── API Key ────────────────────────────────────────────────────────────
        ttk.Label(self, text="API Key de Anthropic *").grid(
            row=1, column=0, sticky="w", pady=4
        )
        self._var_api = tk.StringVar(value=self._cfg.get("api_key", ""))
        frame_api = ttk.Frame(self)
        frame_api.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(0, 12))
        self.columnconfigure(0, weight=1)
        frame_api.columnconfigure(0, weight=1)

        self._entry_api = ttk.Entry(frame_api, textvariable=self._var_api, show="*", width=60)
        self._entry_api.grid(row=0, column=0, sticky="ew", padx=(0, 8))
        ttk.Button(frame_api, text="👁 Mostrar", command=self._toggle_api).grid(row=0, column=1)

        ttk.Label(
            self,
            text="Necesaria para analizar tickets con IA. Obtén tu clave en console.anthropic.com",
            foreground="gray",
        ).grid(row=3, column=0, columnspan=2, sticky="w", pady=(0, 16))

        # ── Navegador ─────────────────────────────────────────────────────────
        ttk.Label(self, text="Navegador preferido").grid(
            row=4, column=0, sticky="w", pady=4
        )
        self._var_nav = tk.StringVar(value=self._cfg.get("navegador", "chromium"))
        frame_nav = ttk.Frame(self)
        frame_nav.grid(row=5, column=0, columnspan=2, sticky="w", pady=(0, 16))
        for nav in ("chromium", "firefox", "webkit"):
            ttk.Radiobutton(frame_nav, text=nav.capitalize(), variable=self._var_nav, value=nav).pack(
                side="left", padx=8
            )

        # ── Email de notificaciones ───────────────────────────────────────────
        ttk.Label(self, text="Email de notificaciones (opcional)").grid(
            row=6, column=0, sticky="w", pady=4
        )
        self._var_email = tk.StringVar(value=self._cfg.get("email_notificaciones", ""))
        ttk.Entry(self, textvariable=self._var_email, width=50).grid(
            row=7, column=0, columnspan=2, sticky="w", pady=(0, 20)
        )

        # ── Botón guardar ──────────────────────────────────────────────────────
        ttk.Button(self, text="💾  Guardar configuración", command=self._guardar).grid(
            row=8, column=0, sticky="w"
        )

        # ── Info versión ──────────────────────────────────────────────────────
        ttk.Separator(self, orient="horizontal").grid(
            row=9, column=0, columnspan=2, sticky="ew", pady=20
        )
        ttk.Label(self, text="Información del sistema", font=("", 11, "bold")).grid(
            row=10, column=0, columnspan=2, sticky="w"
        )
        info_lines = [
            "• CFDI versión: 4.0 (vigente desde enero 2022)",
            "• Marco legal: Miscelánea Fiscal 2024 (RMF 2024)",
            "• Validación RFC: conforme al SAT",
            "• Base de datos: SQLite local (datos privados, no se comparten)",
        ]
        for i, line in enumerate(info_lines):
            ttk.Label(self, text=line, foreground="gray").grid(
                row=11 + i, column=0, columnspan=2, sticky="w", pady=1
            )

    def _toggle_api(self):
        if self._entry_api.cget("show") == "*":
            self._entry_api.config(show="")
        else:
            self._entry_api.config(show="*")

    def _guardar(self):
        self._cfg["api_key"] = self._var_api.get().strip()
        self._cfg["navegador"] = self._var_nav.get()
        self._cfg["email_notificaciones"] = self._var_email.get().strip()
        guardar_config(self._cfg)
        messagebox.showinfo("Configuración", "Configuración guardada correctamente.")

    def get_api_key(self) -> str:
        return self._cfg.get("api_key", "") or self._var_api.get().strip()

    def get_config(self) -> dict:
        return self._cfg
