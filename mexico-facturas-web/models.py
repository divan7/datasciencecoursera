"""
Modelos de datos para FacturaMéxico.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, date


@dataclass
class RegimenFiscal:
    id: Optional[int]
    cuenta_id: int
    codigo: str               # e.g. "626"
    descripcion: str          # e.g. "RESICO"
    uso_cfdi_default: str     # e.g. "G03"
    es_principal: bool = False

    @property
    def etiqueta(self) -> str:
        return f"{self.codigo} - {self.descripcion}"


@dataclass
class CuentaFiscal:
    id: Optional[int]
    alias: str                # Nombre amigable para identificarla
    rfc: str                  # RFC del receptor (12 o 13 chars)
    nombre_razon_social: str  # Nombre o razón social completa
    codigo_postal: str        # CP del domicilio fiscal (5 dígitos)
    email: str                # Email para recibir facturas
    regimenes: list[RegimenFiscal] = field(default_factory=list)
    fecha_creacion: Optional[datetime] = None

    @property
    def regimen_principal(self) -> Optional[RegimenFiscal]:
        principales = [r for r in self.regimenes if r.es_principal]
        return principales[0] if principales else (self.regimenes[0] if self.regimenes else None)


@dataclass
class DatosTicket:
    """Datos extraídos del ticket por OCR."""
    nombre_emisor: Optional[str] = None
    rfc_emisor: Optional[str] = None
    fecha: Optional[str] = None           # YYYY-MM-DD
    total: Optional[float] = None
    folio: Optional[str] = None
    url_facturacion: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    concepto_principal: Optional[str] = None
    imagen_path: Optional[str] = None


@dataclass
class Factura:
    id: Optional[int]
    fecha_ticket: Optional[date]
    fecha_proceso: Optional[datetime]
    emisor_nombre: Optional[str]
    emisor_rfc: Optional[str]
    portal_url: Optional[str]
    total_ticket: Optional[float]
    folio_ticket: Optional[str]
    cuenta_id: Optional[int]
    regimen_id: Optional[int]
    uso_cfdi: Optional[str]
    folio_fiscal: Optional[str]     # UUID del CFDI una vez obtenido
    estado: str = "pendiente"
    notas: Optional[str] = None
    imagen_path: Optional[str] = None
    # Campos enriquecidos (para display)
    cuenta_alias: Optional[str] = None
    cuenta_rfc: Optional[str] = None
    regimen_codigo: Optional[str] = None
    regimen_descripcion: Optional[str] = None
