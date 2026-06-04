#!/usr/bin/env python3
"""
FacturaMéxico Web — Servidor FastAPI.
Accesible desde cualquier dispositivo en la misma red WiFi.
"""

import json
import re
import shutil
import socket
import sys
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

sys.path.insert(0, str(Path(__file__).parent))

import database as db
from constants import (APP_CONFIG_DIR, ESTADOS_FACTURA, MESES_ES,
                       PORTALES_CONOCIDOS, REGIMENES_FISCALES, TICKETS_DIR,
                       USOS_CFDI)
from models import CuentaFiscal, DatosTicket, Factura, RegimenFiscal

# ─── Setup ───────────────────────────────────────────────────────────────────
CONFIG_FILE = APP_CONFIG_DIR / "config.json"

app = FastAPI(title="FacturaMéxico Web", docs_url=None, redoc_url=None)
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

db.inicializar_db()
TICKETS_DIR.mkdir(parents=True, exist_ok=True)


# ─── Config helpers ───────────────────────────────────────────────────────────
def _load_cfg() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"api_key": "", "navegador": "chromium"}


def _save_cfg(cfg: dict) -> None:
    APP_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


# ─── Serializers ─────────────────────────────────────────────────────────────
def _cuenta_to_dict(c: CuentaFiscal) -> dict:
    return {
        "id": c.id,
        "alias": c.alias,
        "rfc": c.rfc,
        "nombre_razon_social": c.nombre_razon_social,
        "codigo_postal": c.codigo_postal,
        "email": c.email,
        "regimenes": [
            {
                "id": r.id,
                "codigo": r.codigo,
                "descripcion": r.descripcion,
                "uso_cfdi_default": r.uso_cfdi_default,
                "es_principal": r.es_principal,
                "etiqueta": r.etiqueta,
            }
            for r in c.regimenes
        ],
    }


def _factura_to_dict(f: Factura) -> dict:
    return {
        "id": f.id,
        "fecha_ticket": str(f.fecha_ticket) if f.fecha_ticket else None,
        "fecha_proceso": str(f.fecha_proceso) if f.fecha_proceso else None,
        "emisor_nombre": f.emisor_nombre,
        "emisor_rfc": f.emisor_rfc,
        "portal_url": f.portal_url,
        "total_ticket": f.total_ticket,
        "folio_ticket": f.folio_ticket,
        "cuenta_id": f.cuenta_id,
        "regimen_id": f.regimen_id,
        "uso_cfdi": f.uso_cfdi,
        "folio_fiscal": f.folio_fiscal,
        "estado": f.estado,
        "estado_label": ESTADOS_FACTURA.get(f.estado, f.estado),
        "notas": f.notas,
        "cuenta_alias": f.cuenta_alias,
        "cuenta_rfc": f.cuenta_rfc,
        "regimen_codigo": f.regimen_codigo,
        "regimen_descripcion": f.regimen_descripcion,
        "imagen_path": f.imagen_path,
    }


# ─── Frontend ─────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ─── API: Estadísticas ────────────────────────────────────────────────────────
@app.get("/api/stats")
async def get_stats():
    facturas = db.obtener_facturas()
    completadas = [f for f in facturas if f.estado == "completada"]
    pendientes = [f for f in facturas if f.estado in ("pendiente", "requiere_usuario", "procesando")]
    return {
        "total": len(facturas),
        "completadas": len(completadas),
        "pendientes": len(pendientes),
        "fallidas": sum(1 for f in facturas if f.estado == "fallida"),
        "monto_total": sum(f.total_ticket or 0 for f in facturas),
        "monto_completadas": sum(f.total_ticket or 0 for f in completadas),
        "recientes": [_factura_to_dict(f) for f in facturas[:5]],
    }


# ─── API: Cuentas Fiscales ────────────────────────────────────────────────────
@app.get("/api/cuentas")
async def list_cuentas():
    return [_cuenta_to_dict(c) for c in db.obtener_cuentas()]


@app.post("/api/cuentas")
async def create_cuenta(request: Request):
    data = await request.json()
    cuenta = _dict_to_cuenta(None, data)
    if not _validar_rfc(cuenta.rfc):
        raise HTTPException(400, f"RFC inválido: {cuenta.rfc}")
    if not re.match(r"^\d{5}$", cuenta.codigo_postal):
        raise HTTPException(400, "Código postal debe tener 5 dígitos")
    cid = db.guardar_cuenta(cuenta)
    return {"id": cid, "ok": True}


@app.put("/api/cuentas/{cuenta_id}")
async def update_cuenta(cuenta_id: int, request: Request):
    data = await request.json()
    cuenta = _dict_to_cuenta(cuenta_id, data)
    if not _validar_rfc(cuenta.rfc):
        raise HTTPException(400, f"RFC inválido: {cuenta.rfc}")
    db.guardar_cuenta(cuenta)
    return {"ok": True}


@app.delete("/api/cuentas/{cuenta_id}")
async def delete_cuenta(cuenta_id: int):
    db.eliminar_cuenta(cuenta_id)
    return {"ok": True}


# ─── API: Analizar Ticket (OCR) ───────────────────────────────────────────────
@app.post("/api/analizar-ticket")
async def analizar_ticket(file: UploadFile = File(...)):
    cfg = _load_cfg()
    api_key = cfg.get("api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "API Key de Anthropic no configurada. Ve a Configuración.")

    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    dest = TICKETS_DIR / f"{uuid.uuid4().hex}{ext}"
    with open(dest, "wb") as fh:
        shutil.copyfileobj(file.file, fh)

    try:
        from services.ocr_service import analizar_ticket as _analizar
        datos = _analizar(str(dest), api_key)
    except Exception as exc:
        raise HTTPException(500, f"Error al analizar el ticket: {exc}")

    return {
        "nombre_emisor": datos.nombre_emisor,
        "rfc_emisor": datos.rfc_emisor,
        "fecha": datos.fecha,
        "total": datos.total,
        "folio": datos.folio,
        "url_facturacion": datos.url_facturacion,
        "direccion": datos.direccion,
        "telefono": datos.telefono,
        "concepto_principal": datos.concepto_principal,
        "imagen_path": str(dest),
    }


# ─── API: Facturas ────────────────────────────────────────────────────────────
@app.post("/api/facturas")
async def create_factura(request: Request):
    data = await request.json()
    factura = Factura(
        id=None,
        fecha_ticket=_parse_date(data.get("fecha_ticket")),
        fecha_proceso=datetime.now(),
        emisor_nombre=data.get("emisor_nombre"),
        emisor_rfc=data.get("emisor_rfc"),
        portal_url=data.get("portal_url"),
        total_ticket=_parse_float(data.get("total_ticket")),
        folio_ticket=data.get("folio_ticket"),
        cuenta_id=data.get("cuenta_id"),
        regimen_id=data.get("regimen_id"),
        uso_cfdi=data.get("uso_cfdi"),
        folio_fiscal=data.get("folio_fiscal"),
        estado=data.get("estado", "pendiente"),
        notas=data.get("notas"),
        imagen_path=data.get("imagen_path"),
    )
    fid = db.guardar_factura(factura)
    return {"id": fid, "ok": True}


@app.get("/api/facturas")
async def list_facturas(
    anio: Optional[int] = None,
    mes: Optional[int] = None,
    cuenta_id: Optional[int] = None,
    estado: Optional[str] = None,
):
    facturas = db.obtener_facturas(cuenta_id=cuenta_id, anio=anio, mes=mes)
    if estado and estado != "todos":
        facturas = [f for f in facturas if f.estado == estado]
    return [_factura_to_dict(f) for f in facturas]


@app.get("/api/facturas/{factura_id}")
async def get_factura(factura_id: int):
    f = db.obtener_factura(factura_id)
    if not f:
        raise HTTPException(404, "Factura no encontrada")
    return _factura_to_dict(f)


@app.patch("/api/facturas/{factura_id}")
async def update_factura(factura_id: int, request: Request):
    data = await request.json()
    db.actualizar_estado_factura(
        factura_id,
        estado=data.get("estado", "pendiente"),
        folio_fiscal=data.get("folio_fiscal"),
        notas=data.get("notas"),
    )
    return {"ok": True}


# ─── API: Catálogos SAT ───────────────────────────────────────────────────────
@app.get("/api/catalogos")
async def get_catalogos():
    return {
        "regimenes": [{"codigo": k, "descripcion": v} for k, v in REGIMENES_FISCALES.items()],
        "usos_cfdi": [{"codigo": k, "descripcion": v} for k, v in USOS_CFDI.items()],
        "meses": [{"num": k, "nombre": v} for k, v in MESES_ES.items()],
        "anios": list(range(datetime.now().year, 2021, -1)),
    }


# ─── API: Configuración ───────────────────────────────────────────────────────
@app.get("/api/config")
async def get_config():
    cfg = _load_cfg()
    return {
        "api_key_set": bool(cfg.get("api_key", "").strip()),
        "api_key_preview": ("****" + cfg["api_key"][-4:]) if len(cfg.get("api_key", "")) > 4 else "",
        "navegador": cfg.get("navegador", "chromium"),
    }


@app.post("/api/config")
async def save_config(request: Request):
    data = await request.json()
    cfg = _load_cfg()
    if "api_key" in data and data["api_key"]:
        cfg["api_key"] = data["api_key"].strip()
    if "navegador" in data:
        cfg["navegador"] = data["navegador"]
    _save_cfg(cfg)
    return {"ok": True}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _dict_to_cuenta(cuenta_id: Optional[int], data: dict) -> CuentaFiscal:
    regimenes = []
    for r in data.get("regimenes", []):
        regimenes.append(RegimenFiscal(
            id=r.get("id"),
            cuenta_id=cuenta_id or 0,
            codigo=r["codigo"],
            descripcion=REGIMENES_FISCALES.get(r["codigo"], r["codigo"]),
            uso_cfdi_default=r.get("uso_cfdi_default", "G03"),
            es_principal=r.get("es_principal", False),
        ))
    return CuentaFiscal(
        id=cuenta_id,
        alias=data["alias"].strip(),
        rfc=data["rfc"].upper().strip(),
        nombre_razon_social=data["nombre_razon_social"].strip(),
        codigo_postal=data["codigo_postal"].strip(),
        email=data.get("email", "").strip(),
        regimenes=regimenes,
    )


def _validar_rfc(rfc: str) -> bool:
    rfc = re.sub(r"[^A-ZÑ&0-9]", "", rfc.upper())
    return bool(
        re.match(r"^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$", rfc) or
        re.match(r"^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$", rfc)
    )


def _parse_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(str(s))
    except (ValueError, TypeError):
        return None


def _parse_float(v):
    if v is None:
        return None
    try:
        return float(str(v).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None


def _get_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return socket.gethostbyname(socket.gethostname())


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    ip = _get_local_ip()
    print("\n" + "=" * 50)
    print("  🇲🇽  FacturaMéxico Web  —  CFDI 4.0")
    print("=" * 50)
    print(f"  Computadora:  http://localhost:8000")
    print(f"  Celular/Red:  http://{ip}:8000")
    print("=" * 50)
    print("  Presiona Ctrl+C para detener\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
