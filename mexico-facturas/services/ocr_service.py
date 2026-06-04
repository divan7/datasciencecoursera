"""
Servicio OCR: extrae información de tickets usando Claude Vision API.
"""

import base64
import json
import re
from pathlib import Path
from typing import Optional

import anthropic

from models import DatosTicket
from constants import RFC_A_PORTAL, PORTALES_CONOCIDOS


def analizar_ticket(imagen_path: str, api_key: str) -> DatosTicket:
    """
    Envía la imagen del ticket a Claude y extrae los datos de facturación.
    """
    client = anthropic.Anthropic(api_key=api_key)

    ext = Path(imagen_path).suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    with open(imagen_path, "rb") as fh:
        image_b64 = base64.standard_b64encode(fh.read()).decode()

    prompt = """Eres un asistente fiscal mexicano experto en CFDI 4.0. Analiza este ticket/recibo
de compra y extrae la información necesaria para generar una factura electrónica.

Extrae los siguientes datos y responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto extra):

{
  "nombre_emisor": "Nombre completo del establecimiento o empresa",
  "rfc_emisor": "RFC del emisor (12-13 caracteres) si es visible, o null",
  "fecha": "Fecha de la compra en formato YYYY-MM-DD, o null si no se ve",
  "total": numero_decimal_del_total_a_pagar (sin signos, solo el número),
  "folio": "Número de folio, ticket o referencia si es visible, o null",
  "url_facturacion": "URL o dominio de facturación si aparece en el ticket, o null",
  "direccion": "Dirección del establecimiento si es visible, o null",
  "telefono": "Teléfono si es visible, o null",
  "concepto_principal": "Tipo de gasto: 'alimentos', 'gasolina', 'supermercado', 'farmacia', 'transporte', 'entretenimiento', 'servicios', 'tecnologia', 'ropa', 'otro'"
}

Notas importantes:
- El RFC mexicano tiene formato: 3-4 letras + 6 dígitos + 3 caracteres alfanuméricos
- Si hay varios totales, usa el total final a pagar (incluye IVA)
- Para url_facturacion busca texto como 'factura en:', 'www.', 'http', dominios web, etc.
- Si no puedes leer algún campo claramente, usa null"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_b64,
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )

    raw = response.content[0].text.strip()
    # Limpiar posible markdown
    raw = re.sub(r"^```(?:json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Intentar extraer JSON con regex
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group()) if match else {}

    # Buscar URL de facturación si no se extrajo del ticket
    portal_url = data.get("url_facturacion")
    if not portal_url:
        portal_url = _buscar_portal(data.get("rfc_emisor"), data.get("nombre_emisor"))

    return DatosTicket(
        nombre_emisor=data.get("nombre_emisor"),
        rfc_emisor=_normalizar_rfc(data.get("rfc_emisor")),
        fecha=data.get("fecha"),
        total=_parse_float(data.get("total")),
        folio=str(data.get("folio")) if data.get("folio") else None,
        url_facturacion=portal_url,
        direccion=data.get("direccion"),
        telefono=data.get("telefono"),
        concepto_principal=data.get("concepto_principal"),
        imagen_path=imagen_path,
    )


def buscar_portal_por_nombre(nombre: str) -> Optional[str]:
    """Busca el portal de facturación a partir del nombre del emisor."""
    return _buscar_portal(None, nombre)


def _buscar_portal(rfc: Optional[str], nombre: Optional[str]) -> Optional[str]:
    # 1. Buscar por RFC exacto
    if rfc:
        rfc_norm = rfc.upper().strip()
        if rfc_norm in RFC_A_PORTAL:
            return RFC_A_PORTAL[rfc_norm]

    # 2. Buscar por nombre parcial
    if nombre:
        nombre_upper = nombre.upper()
        for portal in PORTALES_CONOCIDOS:
            if portal["nombre"].upper() in nombre_upper or nombre_upper in portal["nombre"].upper():
                return portal["url"]

    return None


def _normalizar_rfc(rfc: Optional[str]) -> Optional[str]:
    if not rfc:
        return None
    rfc = re.sub(r"[^A-ZÑ&0-9]", "", rfc.upper())
    return rfc if 12 <= len(rfc) <= 13 else None


def _parse_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        cleaned = re.sub(r"[^\d.,]", "", str(value)).replace(",", ".")
        return float(cleaned)
    except (ValueError, TypeError):
        return None
