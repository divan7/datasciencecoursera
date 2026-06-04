"""
Pestaña para procesar tickets y lanzar la automatización de facturación.
"""

import shutil
import threading
import tkinter as tk
import uuid
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Optional

import database as db
from constants import TICKETS_DIR, USOS_CFDI, USOS_LISTA, PORTALES_CONOCIDOS
from models import DatosTicket, Factura
from services.browser_service import BrowserService


def _codigo_de_label(label: str) -> str:
    return label.split(" - ")[0].strip()


class TicketTab(ttk.Frame):
    def __init__(self, parent: ttk.Notebook, get_api_key_fn):
        super().__init__(parent, padding=10)
        self._get_api_key = get_api_key_fn
        self._imagen_path: Optional[str] = None
        self._datos_ticket: Optional[DatosTicket] = None
        self._factura_id: Optional[int] = None
        self._browser_svc: Optional[BrowserService] = None
        TICKETS_DIR.mkdir(parents=True, exist_ok=True)
        self._construir_ui()

    # ──────────────────────────────────────────────────────────────────────────
    def _construir_ui(self):
        self.columnconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(3, weight=1)

        ttk.Label(self, text="Procesar Ticket y Facturar", font=("", 14, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 12)
        )

        # ── Columna izquierda: ticket ──────────────────────────────────────────
        frame_ticket = ttk.LabelFrame(self, text="1. Ticket / Recibo", padding=10)
        frame_ticket.grid(row=1, column=0, sticky="nsew", padx=(0, 8), pady=(0, 8))
        frame_ticket.columnconfigure(0, weight=1)

        # Área de imagen
        self._lbl_imagen = tk.Label(
            frame_ticket,
            text="Haz clic para seleccionar\nla foto del ticket",
            relief="groove", bg="#f0f0f0",
            width=35, height=12, cursor="hand2",
        )
        self._lbl_imagen.grid(row=0, column=0, columnspan=3, sticky="ew", pady=(0, 8))
        self._lbl_imagen.bind("<Button-1>", lambda _: self._seleccionar_imagen())

        ttk.Button(frame_ticket, text="📁 Seleccionar imagen",
                   command=self._seleccionar_imagen).grid(row=1, column=0, pady=4, sticky="w")

        ttk.Button(frame_ticket, text="🔍 Analizar con IA",
                   command=self._analizar_ticket).grid(row=1, column=1, pady=4, sticky="w")

        # Datos extraídos
        frame_datos = ttk.LabelFrame(frame_ticket, text="Datos extraídos del ticket", padding=8)
        frame_datos.grid(row=2, column=0, columnspan=3, sticky="ew", pady=(8, 0))
        frame_datos.columnconfigure(1, weight=1)

        campos_ticket = [
            ("Emisor", "t_emisor"),
            ("RFC Emisor", "t_rfc"),
            ("Fecha", "t_fecha"),
            ("Total ($)", "t_total"),
            ("Folio / Ticket #", "t_folio"),
            ("Portal de facturación", "t_url"),
        ]
        self._vars_ticket: dict[str, tk.StringVar] = {}
        for i, (lbl, key) in enumerate(campos_ticket):
            ttk.Label(frame_datos, text=lbl + ":").grid(row=i, column=0, sticky="w", pady=2, padx=(0, 8))
            var = tk.StringVar()
            entry = ttk.Entry(frame_datos, textvariable=var, width=40)
            entry.grid(row=i, column=1, sticky="ew", pady=2)
            self._vars_ticket[key] = var

        # Botón buscar portal
        ttk.Button(frame_datos, text="🌐 Buscar portal",
                   command=self._buscar_portal).grid(row=len(campos_ticket), column=0, columnspan=2,
                                                       sticky="w", pady=(6, 0))

        # ── Columna derecha: perfil fiscal ─────────────────────────────────────
        frame_fiscal = ttk.LabelFrame(self, text="2. Datos del receptor (tú)", padding=10)
        frame_fiscal.grid(row=1, column=1, sticky="nsew", pady=(0, 8))
        frame_fiscal.columnconfigure(1, weight=1)

        ttk.Label(frame_fiscal, text="Cuenta fiscal:").grid(row=0, column=0, sticky="w", pady=4, padx=(0, 8))
        self._var_cuenta = tk.StringVar()
        self._cb_cuenta = ttk.Combobox(frame_fiscal, textvariable=self._var_cuenta,
                                        state="readonly", width=35)
        self._cb_cuenta.grid(row=0, column=1, sticky="ew", pady=4)
        self._cb_cuenta.bind("<<ComboboxSelected>>", self._on_cuenta_sel)

        ttk.Label(frame_fiscal, text="Régimen fiscal:").grid(row=1, column=0, sticky="w", pady=4, padx=(0, 8))
        self._var_regimen = tk.StringVar()
        self._cb_regimen = ttk.Combobox(frame_fiscal, textvariable=self._var_regimen,
                                         state="readonly", width=35)
        self._cb_regimen.grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(frame_fiscal, text="Uso CFDI:").grid(row=2, column=0, sticky="w", pady=4, padx=(0, 8))
        self._var_uso = tk.StringVar(value="G03 - Gastos en general")
        self._cb_uso = ttk.Combobox(frame_fiscal, textvariable=self._var_uso,
                                     values=USOS_LISTA, state="readonly", width=35)
        self._cb_uso.grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Button(frame_fiscal, text="🔄 Recargar cuentas",
                   command=self._cargar_cuentas).grid(row=3, column=0, columnspan=2, sticky="w", pady=(8, 0))

        # Resumen fiscal
        frame_resumen = ttk.LabelFrame(frame_fiscal, text="Resumen CFDI 4.0", padding=8)
        frame_resumen.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(12, 0))
        self._lbl_resumen = ttk.Label(frame_resumen, text="Selecciona una cuenta para ver el resumen.",
                                       wraplength=300, justify="left")
        self._lbl_resumen.pack(fill="x")

        # ── Botón principal ────────────────────────────────────────────────────
        frame_accion = ttk.Frame(self)
        frame_accion.grid(row=2, column=0, columnspan=2, sticky="ew", pady=8)

        self._btn_facturar = ttk.Button(
            frame_accion, text="🚀  Iniciar facturación automática",
            command=self._iniciar_facturacion, style="Accent.TButton"
        )
        self._btn_facturar.pack(side="left", padx=(0, 8))
        ttk.Button(frame_accion, text="✔ Marcar como completada manualmente",
                   command=self._marcar_completada).pack(side="left", padx=(0, 8))
        ttk.Button(frame_accion, text="✖ Marcar como fallida",
                   command=self._marcar_fallida).pack(side="left")

        # ── Log de progreso ────────────────────────────────────────────────────
        frame_log = ttk.LabelFrame(self, text="3. Progreso de facturación", padding=8)
        frame_log.grid(row=3, column=0, columnspan=2, sticky="nsew", pady=(0, 0))
        frame_log.columnconfigure(0, weight=1)
        frame_log.rowconfigure(0, weight=1)

        self._txt_log = tk.Text(frame_log, height=10, state="disabled",
                                 wrap="word", font=("Courier", 10))
        self._txt_log.grid(row=0, column=0, sticky="nsew")
        sb = ttk.Scrollbar(frame_log, command=self._txt_log.yview)
        sb.grid(row=0, column=1, sticky="ns")
        self._txt_log.config(yscrollcommand=sb.set)

        # Tags de colores para el log
        self._txt_log.tag_configure("info", foreground="#1a73e8")
        self._txt_log.tag_configure("success", foreground="#1e8e3e")
        self._txt_log.tag_configure("warning", foreground="#f9ab00")
        self._txt_log.tag_configure("error", foreground="#d93025")
        self._txt_log.tag_configure("user_action", foreground="#e37400", font=("Courier", 10, "bold"))

        # Folio fiscal obtenido
        frame_folio = ttk.Frame(self)
        frame_folio.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        ttk.Label(frame_folio, text="Folio Fiscal (UUID) obtenido:").pack(side="left", padx=(0, 8))
        self._var_folio = tk.StringVar()
        self._entry_folio = ttk.Entry(frame_folio, textvariable=self._var_folio, width=45)
        self._entry_folio.pack(side="left", padx=(0, 8))
        ttk.Button(frame_folio, text="💾 Registrar folio",
                   command=self._registrar_folio).pack(side="left")

        self._cargar_cuentas()

    # ──────────────────────────────────────────────────────────────────────────
    def _cargar_cuentas(self):
        self._cuentas = db.obtener_cuentas()
        labels = [f"{c.alias} [{c.rfc}]" for c in self._cuentas]
        self._cb_cuenta["values"] = labels
        if labels and not self._var_cuenta.get():
            self._cb_cuenta.current(0)
            self._on_cuenta_sel()

    def _on_cuenta_sel(self, _event=None):
        idx = self._cb_cuenta.current()
        if idx < 0 or idx >= len(self._cuentas):
            return
        cuenta = self._cuentas[idx]
        reg_labels = [r.etiqueta for r in cuenta.regimenes]
        self._cb_regimen["values"] = reg_labels
        if reg_labels:
            # Seleccionar el régimen principal
            principal_idx = next(
                (i for i, r in enumerate(cuenta.regimenes) if r.es_principal), 0
            )
            self._cb_regimen.current(principal_idx)
            reg = cuenta.regimenes[principal_idx]
            uso_label = f"{reg.uso_cfdi_default} - {USOS_CFDI.get(reg.uso_cfdi_default, '')}"
            self._var_uso.set(uso_label)
        self._actualizar_resumen(cuenta)

    def _actualizar_resumen(self, cuenta):
        idx = self._cb_regimen.current()
        regs = cuenta.regimenes
        reg = regs[idx] if 0 <= idx < len(regs) else None
        texto = (
            f"RFC: {cuenta.rfc}\n"
            f"Nombre: {cuenta.nombre_razon_social}\n"
            f"CP: {cuenta.codigo_postal}\n"
            f"Régimen: {reg.etiqueta if reg else '-'}\n"
            f"Uso CFDI default: {reg.uso_cfdi_default if reg else '-'}"
        )
        self._lbl_resumen.config(text=texto)

    def _seleccionar_imagen(self):
        path = filedialog.askopenfilename(
            title="Seleccionar foto del ticket",
            filetypes=[("Imágenes", "*.jpg *.jpeg *.png *.webp *.gif *.bmp"), ("Todos", "*.*")],
        )
        if not path:
            return
        # Copiar a directorio de la app
        ext = Path(path).suffix
        dest = TICKETS_DIR / f"{uuid.uuid4().hex}{ext}"
        shutil.copy2(path, dest)
        self._imagen_path = str(dest)
        self._lbl_imagen.config(text=f"✓ {Path(path).name}")
        self._log("info", f"Imagen cargada: {Path(path).name}")

    def _analizar_ticket(self):
        api_key = self._get_api_key()
        if not api_key:
            messagebox.showwarning("API Key",
                                    "Configura tu API Key de Anthropic en la pestaña Configuración.")
            return
        if not self._imagen_path:
            messagebox.showwarning("Sin imagen", "Primero selecciona la foto del ticket.")
            return

        self._log("info", "Analizando ticket con IA... por favor espera.")
        self._btn_facturar.config(state="disabled")

        def run():
            try:
                from services.ocr_service import analizar_ticket
                datos = analizar_ticket(self._imagen_path, api_key)
                self.after(0, lambda: self._mostrar_datos_ticket(datos))
            except Exception as exc:
                self.after(0, lambda: self._log("error", f"Error al analizar: {exc}"))
            finally:
                self.after(0, lambda: self._btn_facturar.config(state="normal"))

        threading.Thread(target=run, daemon=True).start()

    def _mostrar_datos_ticket(self, datos: DatosTicket):
        self._datos_ticket = datos
        self._vars_ticket["t_emisor"].set(datos.nombre_emisor or "")
        self._vars_ticket["t_rfc"].set(datos.rfc_emisor or "")
        self._vars_ticket["t_fecha"].set(datos.fecha or "")
        self._vars_ticket["t_total"].set(str(datos.total) if datos.total else "")
        self._vars_ticket["t_folio"].set(datos.folio or "")
        self._vars_ticket["t_url"].set(datos.url_facturacion or "")
        self._log("success", f"Ticket analizado: {datos.nombre_emisor} — Total: ${datos.total}")
        if not datos.url_facturacion:
            self._log("warning", "No se encontró portal de facturación automáticamente. "
                      "Puedes buscarlo con el botón 'Buscar portal'.")

    def _buscar_portal(self):
        nombre = self._vars_ticket["t_emisor"].get().strip()
        rfc = self._vars_ticket["t_rfc"].get().strip()
        from services.ocr_service import _buscar_portal as bp
        url = bp(rfc or None, nombre or None)
        if url:
            self._vars_ticket["t_url"].set(url)
            self._log("info", f"Portal encontrado: {url}")
        else:
            self._log("warning", "No se encontró portal conocido. Ingresa la URL manualmente.")

    def _iniciar_facturacion(self):
        # Validar datos
        url = self._vars_ticket["t_url"].get().strip()
        if not url:
            messagebox.showwarning("URL faltante",
                                    "Ingresa la URL del portal de facturación.")
            return
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
            self._vars_ticket["t_url"].set(url)

        api_key = self._get_api_key()
        if not api_key:
            messagebox.showwarning("API Key",
                                    "Configura tu API Key de Anthropic en la pestaña Configuración.")
            return

        idx_cuenta = self._cb_cuenta.current()
        idx_reg = self._cb_regimen.current()
        if idx_cuenta < 0 or idx_cuenta >= len(self._cuentas):
            messagebox.showwarning("Cuenta", "Selecciona una cuenta fiscal.")
            return
        cuenta = self._cuentas[idx_cuenta]
        regimenes = cuenta.regimenes
        if idx_reg < 0 or idx_reg >= len(regimenes):
            messagebox.showwarning("Régimen", "Selecciona un régimen fiscal.")
            return
        regimen = regimenes[idx_reg]
        uso_cfdi = _codigo_de_label(self._var_uso.get())

        # Preparar datos para la automatización
        fiscal_data = {
            "rfc": cuenta.rfc,
            "nombre": cuenta.nombre_razon_social,
            "codigo_postal": cuenta.codigo_postal,
            "email": cuenta.email,
            "regimen_codigo": regimen.codigo,
            "regimen_descripcion": regimen.descripcion,
            "uso_cfdi": uso_cfdi,
        }
        ticket_data = {
            "nombre_emisor": self._vars_ticket["t_emisor"].get(),
            "rfc_emisor": self._vars_ticket["t_rfc"].get(),
            "fecha": self._vars_ticket["t_fecha"].get(),
            "total": self._vars_ticket["t_total"].get(),
            "folio": self._vars_ticket["t_folio"].get(),
        }

        # Guardar factura como "procesando"
        factura = Factura(
            id=None,
            fecha_ticket=_parse_date(ticket_data["fecha"]),
            fecha_proceso=datetime.now(),
            emisor_nombre=ticket_data["nombre_emisor"] or None,
            emisor_rfc=ticket_data["rfc_emisor"] or None,
            portal_url=url,
            total_ticket=_parse_float(ticket_data["total"]),
            folio_ticket=ticket_data["folio"] or None,
            cuenta_id=cuenta.id,
            regimen_id=regimen.id,
            uso_cfdi=uso_cfdi,
            folio_fiscal=None,
            estado="procesando",
            imagen_path=self._imagen_path,
        )
        self._factura_id = db.guardar_factura(factura)
        self._log("info", f"Factura #{self._factura_id} registrada como 'procesando'.")

        # Lanzar automatización
        self._browser_svc = BrowserService()
        self._browser_svc.iniciar_facturacion(url, fiscal_data, ticket_data, api_key)
        self._btn_facturar.config(state="disabled")
        self._log("info", "Automatización iniciada. El navegador se abrirá en un momento...")
        self.after(500, self._poll_browser)

    def _poll_browser(self):
        if not self._browser_svc:
            return
        msgs = self._browser_svc.leer_mensajes()
        for msg in msgs:
            tipo = msg["tipo"]
            texto = msg["texto"]
            if tipo == "_folio":
                if texto:
                    self._var_folio.set(texto)
                    db.actualizar_estado_factura(
                        self._factura_id, "completada", folio_fiscal=texto
                    )
            else:
                self._log(tipo, texto)
                if tipo == "success":
                    db.actualizar_estado_factura(self._factura_id, "completada")
                    self._btn_facturar.config(state="normal")
                elif tipo == "user_action":
                    db.actualizar_estado_factura(
                        self._factura_id, "requiere_usuario", notas=texto
                    )
                    self._btn_facturar.config(state="normal")
                elif tipo == "error":
                    db.actualizar_estado_factura(
                        self._factura_id, "fallida", notas=texto
                    )
                    self._btn_facturar.config(state="normal")

        # Seguir polling mientras haya automatización activa
        if self._browser_svc and any(
            msg["tipo"] in ("success", "user_action", "error")
            for msg in msgs
        ):
            self._browser_svc = None
        else:
            self.after(500, self._poll_browser)

    def _marcar_completada(self):
        if not self._factura_id:
            messagebox.showinfo("Sin factura activa", "Primero procesa un ticket.")
            return
        folio = self._var_folio.get().strip() or None
        db.actualizar_estado_factura(self._factura_id, "completada", folio_fiscal=folio)
        self._log("success", f"Factura #{self._factura_id} marcada como completada.")

    def _marcar_fallida(self):
        if not self._factura_id:
            messagebox.showinfo("Sin factura activa", "Primero procesa un ticket.")
            return
        db.actualizar_estado_factura(self._factura_id, "fallida")
        self._log("warning", f"Factura #{self._factura_id} marcada como fallida.")

    def _registrar_folio(self):
        if not self._factura_id:
            messagebox.showinfo("Sin factura activa", "Primero procesa un ticket.")
            return
        folio = self._var_folio.get().strip()
        if not folio:
            messagebox.showwarning("Folio vacío", "Ingresa el folio fiscal (UUID).")
            return
        db.actualizar_estado_factura(self._factura_id, "completada", folio_fiscal=folio)
        self._log("success", f"Folio {folio} registrado para factura #{self._factura_id}.")

    def _log(self, tipo: str, texto: str):
        ts = datetime.now().strftime("%H:%M:%S")
        icono = {"info": "ℹ", "success": "✓", "warning": "⚠", "error": "✗",
                 "user_action": "👤"}.get(tipo, "•")
        self._txt_log.config(state="normal")
        self._txt_log.insert("end", f"[{ts}] {icono} {texto}\n", tipo)
        self._txt_log.see("end")
        self._txt_log.config(state="disabled")

    def refresh(self):
        self._cargar_cuentas()


def _parse_date(s: str):
    if not s:
        return None
    try:
        from datetime import date
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _parse_float(s: str):
    if not s:
        return None
    try:
        return float(str(s).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None
