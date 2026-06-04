"""
Pestaña de registro histórico de facturas.
Organizado por mes, cuenta fiscal y régimen.
"""

import csv
import tkinter as tk
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Optional

import database as db
from constants import MESES_ES, ESTADOS_FACTURA


_COLOR_ESTADO = {
    "completada": "#1e8e3e",
    "pendiente": "#f9ab00",
    "procesando": "#1a73e8",
    "fallida": "#d93025",
    "requiere_usuario": "#e37400",
}


class RegistroTab(ttk.Frame):
    def __init__(self, parent: ttk.Notebook):
        super().__init__(parent, padding=10)
        self._construir_ui()
        self.refresh()

    # ──────────────────────────────────────────────────────────────────────────
    def _construir_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        # ── Título y filtros ───────────────────────────────────────────────────
        ttk.Label(self, text="Registro de Facturas", font=("", 14, "bold")).grid(
            row=0, column=0, sticky="w", pady=(0, 8)
        )

        frame_filtros = ttk.LabelFrame(self, text="Filtros", padding=8)
        frame_filtros.grid(row=1, column=0, sticky="ew", pady=(0, 8))

        ttk.Label(frame_filtros, text="Año:").grid(row=0, column=0, padx=(0, 4))
        self._var_anio = tk.StringVar(value=str(datetime.now().year))
        anios = [str(y) for y in range(datetime.now().year, 2021, -1)] + ["Todos"]
        cb_anio = ttk.Combobox(frame_filtros, textvariable=self._var_anio, values=anios,
                                state="readonly", width=8)
        cb_anio.grid(row=0, column=1, padx=(0, 16))

        ttk.Label(frame_filtros, text="Mes:").grid(row=0, column=2, padx=(0, 4))
        self._var_mes = tk.StringVar(value="Todos")
        meses = ["Todos"] + [MESES_ES[m] for m in range(1, 13)]
        cb_mes = ttk.Combobox(frame_filtros, textvariable=self._var_mes, values=meses,
                               state="readonly", width=12)
        cb_mes.grid(row=0, column=3, padx=(0, 16))

        ttk.Label(frame_filtros, text="Cuenta:").grid(row=0, column=4, padx=(0, 4))
        self._var_cuenta_f = tk.StringVar(value="Todas")
        self._cb_cuenta_f = ttk.Combobox(frame_filtros, textvariable=self._var_cuenta_f,
                                          state="readonly", width=25)
        self._cb_cuenta_f.grid(row=0, column=5, padx=(0, 16))

        ttk.Label(frame_filtros, text="Estado:").grid(row=0, column=6, padx=(0, 4))
        self._var_estado_f = tk.StringVar(value="Todos")
        estados = ["Todos"] + list(ESTADOS_FACTURA.values())
        ttk.Combobox(frame_filtros, textvariable=self._var_estado_f, values=estados,
                     state="readonly", width=20).grid(row=0, column=7, padx=(0, 16))

        ttk.Button(frame_filtros, text="🔍 Filtrar", command=self.refresh).grid(row=0, column=8, padx=(0, 8))
        ttk.Button(frame_filtros, text="📋 Exportar CSV", command=self._exportar_csv).grid(row=0, column=9)

        # ── Árbol de facturas organizado por mes/cuenta/régimen ───────────────
        frame_tree = ttk.Frame(self)
        frame_tree.grid(row=2, column=0, sticky="nsew")
        frame_tree.columnconfigure(0, weight=1)
        frame_tree.rowconfigure(0, weight=1)

        cols = ("Fecha", "Emisor", "RFC Emisor", "Total", "Régimen", "Uso CFDI", "Estado", "Folio Fiscal")
        self._tree = ttk.Treeview(frame_tree, columns=cols, show="tree headings")
        self._tree.heading("#0", text="Mes / Cuenta")
        self._tree.column("#0", width=220, stretch=False)
        widths = (90, 180, 110, 80, 200, 120, 130, 300)
        for col, w in zip(cols, widths):
            self._tree.heading(col, text=col, command=lambda c=col: self._sort_by(c))
            self._tree.column(col, width=w, anchor="w" if col not in ("Total",) else "e")

        sb_v = ttk.Scrollbar(frame_tree, orient="vertical", command=self._tree.yview)
        sb_h = ttk.Scrollbar(frame_tree, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=sb_v.set, xscrollcommand=sb_h.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        sb_v.grid(row=0, column=1, sticky="ns")
        sb_h.grid(row=1, column=0, sticky="ew")

        self._tree.bind("<Double-1>", self._on_doble_click)

        # ── Panel de estadísticas ──────────────────────────────────────────────
        frame_stats = ttk.LabelFrame(self, text="Resumen del período", padding=8)
        frame_stats.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        frame_stats.columnconfigure(0, weight=1)
        frame_stats.columnconfigure(1, weight=1)
        frame_stats.columnconfigure(2, weight=1)
        frame_stats.columnconfigure(3, weight=1)

        self._lbl_total_facturas = ttk.Label(frame_stats, text="Total facturas: 0", font=("", 10))
        self._lbl_total_facturas.grid(row=0, column=0, padx=16)
        self._lbl_completadas = ttk.Label(frame_stats, text="✓ Completadas: 0",
                                           foreground="#1e8e3e", font=("", 10, "bold"))
        self._lbl_completadas.grid(row=0, column=1, padx=16)
        self._lbl_pendientes = ttk.Label(frame_stats, text="⏳ Pendientes: 0",
                                          foreground="#f9ab00", font=("", 10))
        self._lbl_pendientes.grid(row=0, column=2, padx=16)
        self._lbl_monto = ttk.Label(frame_stats, text="Monto total: $0.00", font=("", 10, "bold"))
        self._lbl_monto.grid(row=0, column=3, padx=16)

    # ──────────────────────────────────────────────────────────────────────────
    def refresh(self):
        # Recargar lista de cuentas
        cuentas = db.obtener_cuentas()
        labels_cuenta = ["Todas"] + [f"{c.alias} [{c.rfc}]" for c in cuentas]
        self._cb_cuenta_f["values"] = labels_cuenta
        self._cuentas = cuentas

        # Aplicar filtros
        anio_str = self._var_anio.get()
        mes_str = self._var_mes.get()
        cuenta_str = self._var_cuenta_f.get()
        estado_str = self._var_estado_f.get()

        anio = int(anio_str) if anio_str != "Todos" else None
        mes_num = next((m for m, n in MESES_ES.items() if n == mes_str), None)
        cuenta_id = None
        if cuenta_str and cuenta_str != "Todas":
            idx = labels_cuenta.index(cuenta_str) - 1
            if 0 <= idx < len(cuentas):
                cuenta_id = cuentas[idx].id

        facturas = db.obtener_facturas(cuenta_id=cuenta_id, anio=anio, mes=mes_num)

        # Filtrar por estado
        if estado_str and estado_str != "Todos":
            estado_key = next((k for k, v in ESTADOS_FACTURA.items() if v == estado_str), None)
            if estado_key:
                facturas = [f for f in facturas if f.estado == estado_key]

        self._poblar_tree(facturas)
        self._actualizar_stats(facturas)

    def _poblar_tree(self, facturas):
        self._tree.delete(*self._tree.get_children())

        # Organizar: año-mes → cuenta → régimen → facturas
        agrupado: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
        for f in facturas:
            if f.fecha_ticket:
                mes_key = f"{f.fecha_ticket.year}-{f.fecha_ticket.month:02d}"
                mes_label = f"{MESES_ES.get(f.fecha_ticket.month, '')} {f.fecha_ticket.year}"
            else:
                mes_key = "sin-fecha"
                mes_label = "Sin fecha"
            cuenta_key = f"{f.cuenta_alias or 'Sin cuenta'} [{f.cuenta_rfc or ''}]"
            agrupado[(mes_key, mes_label)][cuenta_key].append(f)

        for (mes_key, mes_label), cuentas_dict in sorted(agrupado.items(), reverse=True):
            # Nodo mes
            nodo_mes = self._tree.insert(
                "", "end", iid=f"mes_{mes_key}",
                text=f"📅 {mes_label}",
                values=("", "", "", "", "", "", "", ""),
                open=True, tags=("mes",)
            )

            for cuenta_label, fs in sorted(cuentas_dict.items()):
                total_cuenta = sum(f.total_ticket or 0 for f in fs)
                comp_cuenta = sum(1 for f in fs if f.estado == "completada")
                # Nodo cuenta
                nodo_cuenta = self._tree.insert(
                    nodo_mes, "end",
                    iid=f"cta_{mes_key}_{cuenta_label}",
                    text=f"👤 {cuenta_label}",
                    values=("", "", "", f"${total_cuenta:,.2f}",
                            f"{comp_cuenta}/{len(fs)} completadas", "", "", ""),
                    open=True, tags=("cuenta",)
                )

                # Agrupar por régimen
                por_regimen: dict[str, list] = defaultdict(list)
                for f in fs:
                    reg_key = f"{f.regimen_codigo or ''} - {f.regimen_descripcion or 'Sin régimen'}"
                    por_regimen[reg_key].append(f)

                for reg_label, reg_fs in sorted(por_regimen.items()):
                    total_reg = sum(f.total_ticket or 0 for f in reg_fs)
                    nodo_reg = self._tree.insert(
                        nodo_cuenta, "end",
                        iid=f"reg_{mes_key}_{cuenta_label}_{reg_label}",
                        text=f"📋 {reg_label}",
                        values=("", "", "", f"${total_reg:,.2f}", reg_label, "", "", ""),
                        open=True, tags=("regimen",)
                    )

                    # Facturas individuales
                    for f in reg_fs:
                        estado_txt = ESTADOS_FACTURA.get(f.estado, f.estado)
                        tag = f.estado
                        self._tree.insert(
                            nodo_reg, "end",
                            iid=f"fac_{f.id}",
                            text="",
                            values=(
                                str(f.fecha_ticket) if f.fecha_ticket else "",
                                f.emisor_nombre or "",
                                f.emisor_rfc or "",
                                f"${f.total_ticket:,.2f}" if f.total_ticket else "",
                                f"{f.regimen_codigo or ''} - {f.regimen_descripcion or ''}",
                                f.uso_cfdi or "",
                                estado_txt,
                                f.folio_fiscal or "",
                            ),
                            tags=(tag,),
                        )

        # Colores de estado
        for estado, color in _COLOR_ESTADO.items():
            self._tree.tag_configure(estado, foreground=color)
        self._tree.tag_configure("mes", font=("", 10, "bold"), background="#e8f0fe")
        self._tree.tag_configure("cuenta", font=("", 10, "bold"), background="#f1f8e9")
        self._tree.tag_configure("regimen", foreground="#666", background="#fafafa")

    def _actualizar_stats(self, facturas):
        total = len(facturas)
        completadas = sum(1 for f in facturas if f.estado == "completada")
        pendientes = sum(1 for f in facturas if f.estado in ("pendiente", "requiere_usuario"))
        monto = sum(f.total_ticket or 0 for f in facturas)

        self._lbl_total_facturas.config(text=f"Total facturas: {total}")
        self._lbl_completadas.config(text=f"✓ Completadas: {completadas}")
        self._lbl_pendientes.config(text=f"⏳ Pendientes/Acción: {pendientes}")
        self._lbl_monto.config(text=f"Monto total: ${monto:,.2f}")

    def _on_doble_click(self, event):
        sel = self._tree.selection()
        if not sel:
            return
        iid = sel[0]
        if not iid.startswith("fac_"):
            return
        factura_id = int(iid.replace("fac_", ""))
        factura = db.obtener_factura(factura_id)
        if factura:
            self._mostrar_detalle(factura)

    def _mostrar_detalle(self, f):
        win = tk.Toplevel(self)
        win.title(f"Detalle – Factura #{f.id}")
        win.resizable(False, False)
        pad = ttk.Frame(win, padding=16)
        pad.pack(fill="both", expand=True)

        campos = [
            ("ID", str(f.id)),
            ("Fecha ticket", str(f.fecha_ticket) if f.fecha_ticket else ""),
            ("Fecha proceso", str(f.fecha_proceso) if f.fecha_proceso else ""),
            ("Emisor", f.emisor_nombre or ""),
            ("RFC Emisor", f.emisor_rfc or ""),
            ("Total", f"${f.total_ticket:,.2f}" if f.total_ticket else ""),
            ("Folio ticket", f.folio_ticket or ""),
            ("Portal", f.portal_url or ""),
            ("Cuenta", f"{f.cuenta_alias} [{f.cuenta_rfc}]" if f.cuenta_alias else ""),
            ("Régimen", f"{f.regimen_codigo} - {f.regimen_descripcion}" if f.regimen_codigo else ""),
            ("Uso CFDI", f.uso_cfdi or ""),
            ("Estado", ESTADOS_FACTURA.get(f.estado, f.estado)),
            ("Folio Fiscal (UUID)", f.folio_fiscal or "— no obtenido —"),
            ("Notas", f.notas or ""),
        ]
        for i, (lbl, val) in enumerate(campos):
            ttk.Label(pad, text=lbl + ":", font=("", 9, "bold")).grid(
                row=i, column=0, sticky="w", padx=(0, 12), pady=2
            )
            ttk.Label(pad, text=val, wraplength=400).grid(row=i, column=1, sticky="w", pady=2)

        ttk.Button(pad, text="Cerrar", command=win.destroy).grid(
            row=len(campos), column=0, columnspan=2, pady=(12, 0)
        )

    def _exportar_csv(self):
        path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV", "*.csv")],
            initialfile=f"facturas_{datetime.now().strftime('%Y%m%d')}.csv",
        )
        if not path:
            return
        facturas = db.obtener_facturas()
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "ID", "Fecha Ticket", "Emisor", "RFC Emisor", "Total",
                "Folio Ticket", "Portal", "Cuenta", "RFC Receptor",
                "Régimen", "Uso CFDI", "Estado", "Folio Fiscal (UUID)",
                "Fecha Proceso", "Notas",
            ])
            for fac in facturas:
                writer.writerow([
                    fac.id, fac.fecha_ticket, fac.emisor_nombre, fac.emisor_rfc,
                    fac.total_ticket, fac.folio_ticket, fac.portal_url,
                    fac.cuenta_alias, fac.cuenta_rfc,
                    f"{fac.regimen_codigo} - {fac.regimen_descripcion}" if fac.regimen_codigo else "",
                    fac.uso_cfdi, ESTADOS_FACTURA.get(fac.estado, fac.estado),
                    fac.folio_fiscal, fac.fecha_proceso, fac.notas,
                ])
        messagebox.showinfo("Exportar", f"Archivo guardado en:\n{path}")

    def _sort_by(self, col):
        pass  # Sorting reservado para versión futura
