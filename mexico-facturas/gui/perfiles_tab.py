"""
Pestaña de gestión de perfiles (cuentas) fiscales.
"""

import re
import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional

import database as db
from models import CuentaFiscal, RegimenFiscal
from constants import REGIMENES_FISCALES, USOS_CFDI, REGIMENES_LISTA, USOS_LISTA


def _codigo_de_label(label: str) -> str:
    return label.split(" - ")[0].strip()


class PerfilesTab(ttk.Frame):
    def __init__(self, parent: ttk.Notebook):
        super().__init__(parent, padding=10)
        self._cuenta_sel: Optional[CuentaFiscal] = None
        self._construir_ui()
        self._cargar_cuentas()

    # ──────────────────────────────────────────────────────────────────────────
    def _construir_ui(self):
        self.columnconfigure(0, weight=0)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(0, weight=1)

        # Panel izquierdo: lista de cuentas
        frame_lista = ttk.LabelFrame(self, text="Cuentas fiscales", padding=8)
        frame_lista.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        frame_lista.rowconfigure(0, weight=1)

        self._lista = tk.Listbox(frame_lista, width=28, selectmode="single", activestyle="dotbox")
        self._lista.grid(row=0, column=0, sticky="nsew")
        sb = ttk.Scrollbar(frame_lista, command=self._lista.yview)
        sb.grid(row=0, column=1, sticky="ns")
        self._lista.config(yscrollcommand=sb.set)
        self._lista.bind("<<ListboxSelect>>", self._on_seleccion)

        frame_btn_lista = ttk.Frame(frame_lista)
        frame_btn_lista.grid(row=1, column=0, columnspan=2, pady=(6, 0))
        ttk.Button(frame_btn_lista, text="+ Nueva", command=self._nueva_cuenta).pack(side="left", padx=4)
        ttk.Button(frame_btn_lista, text="🗑 Eliminar", command=self._eliminar_cuenta).pack(side="left", padx=4)

        # Panel derecho: detalle / formulario
        self._frame_detalle = ttk.LabelFrame(self, text="Datos fiscales (CFDI 4.0)", padding=12)
        self._frame_detalle.grid(row=0, column=1, sticky="nsew")
        self._frame_detalle.columnconfigure(1, weight=1)
        self._construir_formulario()

    def _construir_formulario(self):
        f = self._frame_detalle
        campos = [
            ("Alias / etiqueta *", "alias"),
            ("RFC *", "rfc"),
            ("Nombre o Razón Social *", "nombre"),
            ("Código Postal domicilio fiscal *", "cp"),
            ("Email para recibir facturas", "email"),
        ]
        self._vars: dict[str, tk.StringVar] = {}
        for i, (lbl, key) in enumerate(campos):
            ttk.Label(f, text=lbl).grid(row=i, column=0, sticky="w", pady=4, padx=(0, 12))
            var = tk.StringVar()
            entry = ttk.Entry(f, textvariable=var, width=40)
            entry.grid(row=i, column=1, sticky="ew", pady=4)
            self._vars[key] = var

        # Nota RFC
        ttk.Label(f, text="Formato RFC: 3-4 letras + 6 dígitos + 3 alfanumérico", foreground="gray",
                  font=("", 9)).grid(row=2, column=1, sticky="w")

        ttk.Separator(f, orient="horizontal").grid(
            row=len(campos), column=0, columnspan=2, sticky="ew", pady=12
        )

        # Regímenes fiscales
        ttk.Label(f, text="Regímenes fiscales", font=("", 11, "bold")).grid(
            row=len(campos) + 1, column=0, columnspan=2, sticky="w", pady=(0, 6)
        )

        frame_reg = ttk.Frame(f)
        frame_reg.grid(row=len(campos) + 2, column=0, columnspan=2, sticky="ew")
        frame_reg.columnconfigure(0, weight=1)

        cols = ("Régimen", "Uso CFDI por defecto", "Principal")
        self._tree_reg = ttk.Treeview(frame_reg, columns=cols, show="headings", height=5)
        for col in cols:
            self._tree_reg.heading(col, text=col)
            w = 300 if col == "Régimen" else (200 if col == "Uso CFDI por defecto" else 80)
            self._tree_reg.column(col, width=w, anchor="w" if col != "Principal" else "center")
        self._tree_reg.grid(row=0, column=0, sticky="ew")
        sb2 = ttk.Scrollbar(frame_reg, command=self._tree_reg.yview)
        sb2.grid(row=0, column=1, sticky="ns")
        self._tree_reg.config(yscrollcommand=sb2.set)

        # Controles para agregar régimen
        frame_add_reg = ttk.Frame(f)
        frame_add_reg.grid(row=len(campos) + 3, column=0, columnspan=2, sticky="ew", pady=6)
        frame_add_reg.columnconfigure(1, weight=1)
        frame_add_reg.columnconfigure(3, weight=1)

        ttk.Label(frame_add_reg, text="Régimen:").grid(row=0, column=0, padx=(0, 4))
        self._var_reg_nuevo = tk.StringVar()
        cb_reg = ttk.Combobox(frame_add_reg, textvariable=self._var_reg_nuevo,
                               values=REGIMENES_LISTA, state="readonly", width=40)
        cb_reg.grid(row=0, column=1, padx=(0, 8))

        ttk.Label(frame_add_reg, text="Uso CFDI:").grid(row=0, column=2, padx=(0, 4))
        self._var_uso_nuevo = tk.StringVar(value="G03 - Gastos en general")
        cb_uso = ttk.Combobox(frame_add_reg, textvariable=self._var_uso_nuevo,
                               values=USOS_LISTA, state="readonly", width=35)
        cb_uso.grid(row=0, column=3, padx=(0, 8))

        self._var_es_principal = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame_add_reg, text="Principal", variable=self._var_es_principal).grid(
            row=0, column=4, padx=(0, 8)
        )
        ttk.Button(frame_add_reg, text="+ Agregar", command=self._agregar_regimen).grid(row=0, column=5)

        frame_del_reg = ttk.Frame(f)
        frame_del_reg.grid(row=len(campos) + 4, column=0, columnspan=2, sticky="w", pady=(0, 8))
        ttk.Button(frame_del_reg, text="Quitar régimen seleccionado",
                   command=self._quitar_regimen).pack(side="left")

        # Botones guardar / limpiar
        frame_acc = ttk.Frame(f)
        frame_acc.grid(row=len(campos) + 5, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        ttk.Button(frame_acc, text="💾  Guardar cuenta", command=self._guardar_cuenta).pack(side="left", padx=(0, 8))
        ttk.Button(frame_acc, text="✖ Cancelar", command=self._limpiar_formulario).pack(side="left")

        self._limpiar_formulario()

    # ──────────────────────────────────────────────────────────────────────────
    def _cargar_cuentas(self):
        self._cuentas = db.obtener_cuentas()
        self._lista.delete(0, "end")
        for c in self._cuentas:
            self._lista.insert("end", f"{c.alias}  [{c.rfc}]")

    def _on_seleccion(self, _event=None):
        sel = self._lista.curselection()
        if not sel:
            return
        self._cuenta_sel = self._cuentas[sel[0]]
        self._mostrar_cuenta(self._cuenta_sel)

    def _mostrar_cuenta(self, cuenta: CuentaFiscal):
        self._vars["alias"].set(cuenta.alias)
        self._vars["rfc"].set(cuenta.rfc)
        self._vars["nombre"].set(cuenta.nombre_razon_social)
        self._vars["cp"].set(cuenta.codigo_postal)
        self._vars["email"].set(cuenta.email or "")
        self._poblar_tree_reg(cuenta.regimenes)

    def _poblar_tree_reg(self, regimenes: list[RegimenFiscal]):
        self._tree_reg.delete(*self._tree_reg.get_children())
        for r in regimenes:
            uso_label = f"{r.uso_cfdi_default} - {USOS_CFDI.get(r.uso_cfdi_default, '')}"
            principal = "✓" if r.es_principal else ""
            self._tree_reg.insert("", "end", iid=r.codigo,
                                   values=(r.etiqueta, uso_label, principal))

    def _nueva_cuenta(self):
        self._cuenta_sel = None
        self._limpiar_formulario()

    def _limpiar_formulario(self):
        for var in self._vars.values():
            var.set("")
        self._tree_reg.delete(*self._tree_reg.get_children())
        self._cuenta_sel = None

    def _agregar_regimen(self):
        reg_label = self._var_reg_nuevo.get()
        uso_label = self._var_uso_nuevo.get()
        if not reg_label or not uso_label:
            messagebox.showwarning("Régimen", "Selecciona un régimen y un uso CFDI.")
            return
        reg_codigo = _codigo_de_label(reg_label)
        uso_codigo = _codigo_de_label(uso_label)
        if self._tree_reg.exists(reg_codigo):
            messagebox.showwarning("Régimen", "Este régimen ya está en la lista.")
            return
        principal = "✓" if self._var_es_principal.get() else ""
        self._tree_reg.insert("", "end", iid=reg_codigo, values=(reg_label, uso_label, principal))

    def _quitar_regimen(self):
        sel = self._tree_reg.selection()
        if sel:
            self._tree_reg.delete(sel[0])

    def _guardar_cuenta(self):
        alias = self._vars["alias"].get().strip()
        rfc = self._vars["rfc"].get().strip().upper()
        nombre = self._vars["nombre"].get().strip()
        cp = self._vars["cp"].get().strip()
        email = self._vars["email"].get().strip()

        if not alias or not rfc or not nombre or not cp:
            messagebox.showwarning("Datos incompletos", "Los campos marcados con * son obligatorios.")
            return
        if not _validar_rfc(rfc):
            messagebox.showerror("RFC inválido",
                                  f"El RFC '{rfc}' no tiene el formato correcto.\n"
                                  "Debe tener 12 caracteres (personas morales) o 13 (personas físicas).")
            return
        if not re.match(r"^\d{5}$", cp):
            messagebox.showerror("CP inválido", "El código postal debe tener exactamente 5 dígitos.")
            return

        # Leer regímenes del treeview
        regimenes = []
        for iid in self._tree_reg.get_children():
            vals = self._tree_reg.item(iid)["values"]
            reg_label, uso_label, principal_mark = vals
            reg_codigo = _codigo_de_label(str(reg_label))
            uso_codigo = _codigo_de_label(str(uso_label))
            reg_desc = REGIMENES_FISCALES.get(reg_codigo, reg_label)
            regimenes.append(RegimenFiscal(
                id=None, cuenta_id=0,
                codigo=reg_codigo, descripcion=reg_desc,
                uso_cfdi_default=uso_codigo,
                es_principal=(str(principal_mark) == "✓"),
            ))

        if not regimenes:
            messagebox.showwarning("Regímenes", "Agrega al menos un régimen fiscal.")
            return

        cuenta = CuentaFiscal(
            id=self._cuenta_sel.id if self._cuenta_sel else None,
            alias=alias, rfc=rfc, nombre_razon_social=nombre,
            codigo_postal=cp, email=email, regimenes=regimenes,
        )
        db.guardar_cuenta(cuenta)
        messagebox.showinfo("Éxito", f"Cuenta '{alias}' guardada correctamente.")
        self._cargar_cuentas()
        self._limpiar_formulario()

    def _eliminar_cuenta(self):
        sel = self._lista.curselection()
        if not sel:
            messagebox.showinfo("Eliminar", "Selecciona una cuenta de la lista.")
            return
        cuenta = self._cuentas[sel[0]]
        if messagebox.askyesno("Eliminar cuenta",
                                f"¿Eliminar la cuenta '{cuenta.alias}' ({cuenta.rfc})?\n"
                                "Se eliminarán también sus regímenes y la relación con facturas existentes."):
            db.eliminar_cuenta(cuenta.id)
            self._cargar_cuentas()
            self._limpiar_formulario()

    def refresh(self):
        self._cargar_cuentas()


def _validar_rfc(rfc: str) -> bool:
    rfc = re.sub(r"[^A-ZÑ&0-9]", "", rfc.upper())
    pattern_moral = r"^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$"
    pattern_fisica = r"^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$"
    return bool(re.match(pattern_moral, rfc) or re.match(pattern_fisica, rfc))
