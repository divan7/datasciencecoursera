"""
Capa de acceso a datos para FacturaMéxico (SQLite).
"""

import sqlite3
import json
from datetime import datetime, date
from pathlib import Path
from typing import Optional

from constants import APP_DATA_DIR, DB_VERSION
from models import CuentaFiscal, RegimenFiscal, Factura


DB_PATH = APP_DATA_DIR / "facturas.db"

_CREATE_CUENTAS = """
CREATE TABLE IF NOT EXISTS cuentas_fiscales (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    alias            TEXT    NOT NULL,
    rfc              TEXT    NOT NULL UNIQUE,
    nombre_razon_social TEXT NOT NULL,
    codigo_postal    TEXT    NOT NULL,
    email            TEXT    NOT NULL DEFAULT '',
    fecha_creacion   TEXT    DEFAULT (datetime('now'))
)
"""

_CREATE_REGIMENES = """
CREATE TABLE IF NOT EXISTS regimenes_fiscales (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id       INTEGER NOT NULL,
    codigo          TEXT    NOT NULL,
    descripcion     TEXT    NOT NULL,
    uso_cfdi_default TEXT   NOT NULL DEFAULT 'G03',
    es_principal    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas_fiscales(id) ON DELETE CASCADE,
    UNIQUE(cuenta_id, codigo)
)
"""

_CREATE_FACTURAS = """
CREATE TABLE IF NOT EXISTS facturas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_ticket    TEXT,
    fecha_proceso   TEXT    DEFAULT (datetime('now')),
    emisor_nombre   TEXT,
    emisor_rfc      TEXT,
    portal_url      TEXT,
    total_ticket    REAL,
    folio_ticket    TEXT,
    cuenta_id       INTEGER,
    regimen_id      INTEGER,
    uso_cfdi        TEXT,
    folio_fiscal    TEXT,
    estado          TEXT    NOT NULL DEFAULT 'pendiente',
    notas           TEXT,
    imagen_path     TEXT,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas_fiscales(id),
    FOREIGN KEY (regimen_id) REFERENCES regimenes_fiscales(id)
)
"""

_CREATE_META = """
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
)
"""


def _conexion() -> sqlite3.Connection:
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def inicializar_db() -> None:
    with _conexion() as conn:
        conn.execute(_CREATE_CUENTAS)
        conn.execute(_CREATE_REGIMENES)
        conn.execute(_CREATE_FACTURAS)
        conn.execute(_CREATE_META)
        conn.execute("INSERT OR IGNORE INTO meta (key, value) VALUES ('db_version', ?)", (str(DB_VERSION),))
        conn.commit()


# ─── Cuentas Fiscales ─────────────────────────────────────────────────────────

def guardar_cuenta(cuenta: CuentaFiscal) -> int:
    with _conexion() as conn:
        if cuenta.id is None:
            cur = conn.execute(
                "INSERT INTO cuentas_fiscales (alias, rfc, nombre_razon_social, codigo_postal, email) "
                "VALUES (?,?,?,?,?)",
                (cuenta.alias, cuenta.rfc.upper(), cuenta.nombre_razon_social,
                 cuenta.codigo_postal, cuenta.email)
            )
            cuenta_id = cur.lastrowid
        else:
            conn.execute(
                "UPDATE cuentas_fiscales SET alias=?, rfc=?, nombre_razon_social=?, "
                "codigo_postal=?, email=? WHERE id=?",
                (cuenta.alias, cuenta.rfc.upper(), cuenta.nombre_razon_social,
                 cuenta.codigo_postal, cuenta.email, cuenta.id)
            )
            cuenta_id = cuenta.id

        # Sincronizar regímenes
        conn.execute("DELETE FROM regimenes_fiscales WHERE cuenta_id=?", (cuenta_id,))
        for reg in cuenta.regimenes:
            conn.execute(
                "INSERT INTO regimenes_fiscales (cuenta_id, codigo, descripcion, uso_cfdi_default, es_principal) "
                "VALUES (?,?,?,?,?)",
                (cuenta_id, reg.codigo, reg.descripcion, reg.uso_cfdi_default, int(reg.es_principal))
            )
        conn.commit()
    return cuenta_id


def eliminar_cuenta(cuenta_id: int) -> None:
    with _conexion() as conn:
        conn.execute("DELETE FROM cuentas_fiscales WHERE id=?", (cuenta_id,))
        conn.commit()


def obtener_cuentas() -> list[CuentaFiscal]:
    with _conexion() as conn:
        rows = conn.execute(
            "SELECT * FROM cuentas_fiscales ORDER BY alias"
        ).fetchall()
        cuentas = []
        for row in rows:
            reg_rows = conn.execute(
                "SELECT * FROM regimenes_fiscales WHERE cuenta_id=? ORDER BY es_principal DESC, codigo",
                (row["id"],)
            ).fetchall()
            regimenes = [
                RegimenFiscal(
                    id=r["id"], cuenta_id=r["cuenta_id"], codigo=r["codigo"],
                    descripcion=r["descripcion"], uso_cfdi_default=r["uso_cfdi_default"],
                    es_principal=bool(r["es_principal"])
                )
                for r in reg_rows
            ]
            cuentas.append(CuentaFiscal(
                id=row["id"], alias=row["alias"], rfc=row["rfc"],
                nombre_razon_social=row["nombre_razon_social"],
                codigo_postal=row["codigo_postal"], email=row["email"],
                regimenes=regimenes,
                fecha_creacion=datetime.fromisoformat(row["fecha_creacion"]) if row["fecha_creacion"] else None
            ))
    return cuentas


def obtener_cuenta(cuenta_id: int) -> Optional[CuentaFiscal]:
    cuentas = obtener_cuentas()
    return next((c for c in cuentas if c.id == cuenta_id), None)


# ─── Facturas ─────────────────────────────────────────────────────────────────

def guardar_factura(f: Factura) -> int:
    with _conexion() as conn:
        if f.id is None:
            cur = conn.execute(
                "INSERT INTO facturas (fecha_ticket, fecha_proceso, emisor_nombre, emisor_rfc, "
                "portal_url, total_ticket, folio_ticket, cuenta_id, regimen_id, uso_cfdi, "
                "folio_fiscal, estado, notas, imagen_path) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (_str_fecha(f.fecha_ticket), _str_dt(f.fecha_proceso or datetime.now()),
                 f.emisor_nombre, f.emisor_rfc, f.portal_url, f.total_ticket, f.folio_ticket,
                 f.cuenta_id, f.regimen_id, f.uso_cfdi, f.folio_fiscal,
                 f.estado, f.notas, f.imagen_path)
            )
            return cur.lastrowid
        else:
            conn.execute(
                "UPDATE facturas SET fecha_ticket=?, emisor_nombre=?, emisor_rfc=?, portal_url=?, "
                "total_ticket=?, folio_ticket=?, cuenta_id=?, regimen_id=?, uso_cfdi=?, "
                "folio_fiscal=?, estado=?, notas=?, imagen_path=? WHERE id=?",
                (_str_fecha(f.fecha_ticket), f.emisor_nombre, f.emisor_rfc, f.portal_url,
                 f.total_ticket, f.folio_ticket, f.cuenta_id, f.regimen_id, f.uso_cfdi,
                 f.folio_fiscal, f.estado, f.notas, f.imagen_path, f.id)
            )
            conn.commit()
            return f.id


def actualizar_estado_factura(factura_id: int, estado: str,
                               folio_fiscal: Optional[str] = None,
                               notas: Optional[str] = None) -> None:
    with _conexion() as conn:
        conn.execute(
            "UPDATE facturas SET estado=?, folio_fiscal=COALESCE(?,folio_fiscal), "
            "notas=COALESCE(?,notas) WHERE id=?",
            (estado, folio_fiscal, notas, factura_id)
        )
        conn.commit()


def obtener_facturas(cuenta_id: Optional[int] = None, anio: Optional[int] = None,
                     mes: Optional[int] = None, regimen_id: Optional[int] = None) -> list[Factura]:
    sql = """
        SELECT f.*, c.alias AS cuenta_alias, c.rfc AS cuenta_rfc,
               r.codigo AS regimen_codigo, r.descripcion AS regimen_descripcion
        FROM facturas f
        LEFT JOIN cuentas_fiscales c ON f.cuenta_id = c.id
        LEFT JOIN regimenes_fiscales r ON f.regimen_id = r.id
        WHERE 1=1
    """
    params: list = []
    if cuenta_id:
        sql += " AND f.cuenta_id=?"; params.append(cuenta_id)
    if anio:
        sql += " AND strftime('%Y', f.fecha_ticket)=?"; params.append(str(anio))
    if mes:
        sql += " AND strftime('%m', f.fecha_ticket)=?"; params.append(f"{mes:02d}")
    if regimen_id:
        sql += " AND f.regimen_id=?"; params.append(regimen_id)
    sql += " ORDER BY f.fecha_ticket DESC, f.fecha_proceso DESC"

    with _conexion() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [_row_a_factura(r) for r in rows]


def obtener_factura(factura_id: int) -> Optional[Factura]:
    sql = """
        SELECT f.*, c.alias AS cuenta_alias, c.rfc AS cuenta_rfc,
               r.codigo AS regimen_codigo, r.descripcion AS regimen_descripcion
        FROM facturas f
        LEFT JOIN cuentas_fiscales c ON f.cuenta_id = c.id
        LEFT JOIN regimenes_fiscales r ON f.regimen_id = r.id
        WHERE f.id=?
    """
    with _conexion() as conn:
        row = conn.execute(sql, (factura_id,)).fetchone()
        return _row_a_factura(row) if row else None


# ─── Helpers internos ─────────────────────────────────────────────────────────

def _str_fecha(d) -> Optional[str]:
    if d is None:
        return None
    if isinstance(d, str):
        return d
    return d.isoformat()


def _str_dt(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _row_a_factura(row: sqlite3.Row) -> Factura:
    fd = row["fecha_ticket"]
    return Factura(
        id=row["id"],
        fecha_ticket=date.fromisoformat(fd) if fd else None,
        fecha_proceso=datetime.fromisoformat(row["fecha_proceso"]) if row["fecha_proceso"] else None,
        emisor_nombre=row["emisor_nombre"],
        emisor_rfc=row["emisor_rfc"],
        portal_url=row["portal_url"],
        total_ticket=row["total_ticket"],
        folio_ticket=row["folio_ticket"],
        cuenta_id=row["cuenta_id"],
        regimen_id=row["regimen_id"],
        uso_cfdi=row["uso_cfdi"],
        folio_fiscal=row["folio_fiscal"],
        estado=row["estado"],
        notas=row["notas"],
        imagen_path=row["imagen_path"],
        cuenta_alias=row["cuenta_alias"],
        cuenta_rfc=row["cuenta_rfc"],
        regimen_codigo=row["regimen_codigo"],
        regimen_descripcion=row["regimen_descripcion"],
    )
