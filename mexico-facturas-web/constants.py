"""
Constantes fiscales mexicanas conforme al SAT y CFDI 4.0 vigente.
"""

APP_NAME = "FacturaMéxico"
APP_VERSION = "1.0.0"
DB_VERSION = 1

# Directorio de datos de la app
import os
from pathlib import Path

APP_DATA_DIR = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "mexico-facturas"
APP_CONFIG_DIR = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "mexico-facturas"
TICKETS_DIR = APP_DATA_DIR / "tickets"

# ─── Regímenes Fiscales (SAT vigente 2024) ────────────────────────────────────
REGIMENES_FISCALES: dict[str, str] = {
    "601": "General de Ley Personas Morales",
    "603": "Personas Morales con Fines no Lucrativos",
    "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
    "606": "Arrendamiento",
    "607": "Régimen de Enajenación o Adquisición de Bienes",
    "608": "Demás ingresos",
    "610": "Residentes en el Extranjero sin Establecimiento Permanente en México",
    "611": "Ingresos por Dividendos (socios y accionistas)",
    "612": "Personas Físicas con Actividades Empresariales y Profesionales",
    "614": "Ingresos por intereses",
    "615": "Régimen de los ingresos por obtención de premios",
    "616": "Sin obligaciones fiscales",
    "620": "Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
    "621": "Incorporación Fiscal",
    "622": "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
    "623": "Opcional para Grupos de Sociedades",
    "624": "Coordinados",
    "625": "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
    "626": "Régimen Simplificado de Confianza - RESICO",
}

REGIMENES_LISTA = [f"{k} - {v}" for k, v in REGIMENES_FISCALES.items()]


# ─── Usos de CFDI (SAT vigente CFDI 4.0) ─────────────────────────────────────
USOS_CFDI: dict[str, str] = {
    "G01": "Adquisición de mercancias",
    "G02": "Devoluciones, descuentos o bonificaciones",
    "G03": "Gastos en general",
    "I01": "Construcciones",
    "I02": "Mobilario y equipo de oficina por inversiones",
    "I03": "Equipo de transporte",
    "I04": "Equipo de cómputo y accesorios",
    "I05": "Dados, troqueles, moldes, matrices y herramental",
    "I06": "Comunicaciones telefónicas",
    "I07": "Comunicaciones satelitales",
    "I08": "Otra maquinaria y equipo",
    "D01": "Honorarios médicos, dentales y gastos hospitalarios",
    "D02": "Gastos médicos por incapacidad o discapacidad",
    "D03": "Gastos funerales",
    "D04": "Donativos",
    "D05": "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)",
    "D06": "Aportaciones voluntarias al SAR",
    "D07": "Primas por seguros de gastos médicos",
    "D08": "Gastos de transportación escolar obligatoria",
    "D09": "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones",
    "D10": "Pagos por servicios educativos (colegiaturas)",
    "S01": "Sin efectos fiscales",
    "CP01": "Pagos",
    "CN01": "Nómina",
}

USOS_LISTA = [f"{k} - {v}" for k, v in USOS_CFDI.items()]

# Usos válidos según régimen del receptor (restricciones CFDI 4.0)
USOS_POR_REGIMEN: dict[str, list[str]] = {
    "601": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "S01", "CP01"],
    "603": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "S01", "CP01"],
    "605": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "606": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "607": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "608": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "612": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "614": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "616": ["G01", "G02", "G03", "S01", "CP01"],
    "621": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "622": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "S01", "CP01"],
    "625": ["G01", "G02", "G03", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "S01", "CP01"],
    "626": ["G01", "G02", "G03", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "S01", "CP01"],
}


# ─── Portales de facturación conocidos ───────────────────────────────────────
PORTALES_CONOCIDOS: list[dict] = [
    {"nombre": "OXXO", "url": "https://facturas.oxxo.com", "rfcs": ["ORG960527998"]},
    {"nombre": "Walmart", "url": "https://facturas.walmart.com.mx", "rfcs": ["WTM970911E11"]},
    {"nombre": "Bodega Aurrerá", "url": "https://facturas.walmart.com.mx", "rfcs": ["WTM970911E11"]},
    {"nombre": "Sam's Club", "url": "https://facturas.walmart.com.mx", "rfcs": ["WTM970911E11"]},
    {"nombre": "Soriana", "url": "https://www.soriana.com/tienda/facturacion.html", "rfcs": ["CCC8810047H3"]},
    {"nombre": "The Home Depot", "url": "https://facturacion.homedepot.com.mx", "rfcs": ["HDP970101JD4"]},
    {"nombre": "Chedraui", "url": "https://facturacion.chedraui.com.mx", "rfcs": ["CHE850701ER1"]},
    {"nombre": "Costco", "url": "https://facturacion.costco.com.mx", "rfcs": ["CME910715UB9"]},
    {"nombre": "Liverpool", "url": "https://facturacion.liverpool.com.mx", "rfcs": ["PPE871012GQ1"]},
    {"nombre": "Suburbia", "url": "https://facturacion.liverpool.com.mx", "rfcs": []},
    {"nombre": "Sanborns", "url": "https://facturacion.sanborns.com.mx", "rfcs": ["CSA830801TF5"]},
    {"nombre": "7-Eleven", "url": "https://www.7-eleven.com.mx/facturacion", "rfcs": ["CSE960620P62"]},
    {"nombre": "Farmacias del Ahorro", "url": "https://facturacion.fahorro.com", "rfcs": ["FAH810504CE2"]},
    {"nombre": "Farmacias Similares", "url": "https://www.farmaciassimilares.com.mx/facturacion", "rfcs": ["MSI9110099V5"]},
    {"nombre": "PEMEX", "url": "https://facturacion.pemex.com", "rfcs": ["PEP8412102FA"]},
    {"nombre": "AutoZone", "url": "https://facturacion.autozone.com.mx", "rfcs": ["AZO991210HB6"]},
    {"nombre": "Office Depot", "url": "https://facturacion.officedepot.com.mx", "rfcs": ["ODE9511162L3"]},
    {"nombre": "Cinépolis", "url": "https://facturacion.cinepolis.com.mx", "rfcs": ["CEX881215G74"]},
    {"nombre": "Cinemex", "url": "https://facturacion.cinemex.com", "rfcs": []},
    {"nombre": "McDonald's", "url": "https://facturacion.mcdonalds.com.mx", "rfcs": ["AOM9309159W4"]},
    {"nombre": "Starbucks", "url": "https://facturacion.starbucks.com.mx", "rfcs": ["SCA9710038N3"]},
    {"nombre": "Pizza Hut", "url": "https://facturacion.pizzahut.com.mx", "rfcs": []},
    {"nombre": "Domino's Pizza", "url": "https://facturacion.dominospizza.com.mx", "rfcs": []},
    {"nombre": "Elektra", "url": "https://facturacion.elektra.com.mx", "rfcs": ["ELE9207277L2"]},
    {"nombre": "Coppel", "url": "https://facturacion.coppel.com", "rfcs": ["COO671214AE9"]},
    {"nombre": "Palacio de Hierro", "url": "https://facturacion.elpalaciodehierro.com", "rfcs": ["PHI9006076L8"]},
    {"nombre": "Sears", "url": "https://facturacion.sears.com.mx", "rfcs": []},
    {"nombre": "RadioShack", "url": "https://facturacion.radioshack.com.mx", "rfcs": []},
    {"nombre": "Telcel", "url": "https://www.telcel.com/portal/factura-electronica", "rfcs": ["RMO930215AM4"]},
    {"nombre": "Telmex", "url": "https://facturacion.telmex.com", "rfcs": ["TME840315KT6"]},
    {"nombre": "CFE", "url": "https://app.cfe.mx/Aplicaciones/NSCE/Facturacion", "rfcs": ["CFE370814QI0"]},
    {"nombre": "IZZI", "url": "https://facturacion.izzi.mx", "rfcs": ["CVT091022280"]},
    {"nombre": "Megacable", "url": "https://facturacion.megacable.com.mx", "rfcs": ["CME850701EP4"]},
    {"nombre": "Amazon México", "url": "https://www.amazon.com.mx/gp/help/customer/display.html?nodeId=GMGYVLMCNXHQQHQ9", "rfcs": ["SAS130329KT3"]},
    {"nombre": "Uber", "url": "https://www.uber.com/mx/es/driving/resources/billing/", "rfcs": []},
    {"nombre": "Cabify", "url": "https://cabify.com/help", "rfcs": []},
]

# Mapa rápido de RFC → portal URL
RFC_A_PORTAL: dict[str, str] = {}
for _p in PORTALES_CONOCIDOS:
    for _rfc in _p["rfcs"]:
        RFC_A_PORTAL[_rfc] = _p["url"]

# Mapa de nombre → portal URL (búsqueda parcial)
NOMBRE_A_PORTAL: dict[str, str] = {p["nombre"].upper(): p["url"] for p in PORTALES_CONOCIDOS}


# ─── Estados de factura ───────────────────────────────────────────────────────
ESTADOS_FACTURA = {
    "pendiente": "Pendiente",
    "procesando": "Procesando",
    "completada": "Completada",
    "fallida": "Fallida",
    "requiere_usuario": "Requiere acción del usuario",
}

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}
