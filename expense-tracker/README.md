# Orden Casa by SOIHogar

Aplicación web progresiva (PWA) para el control de gastos del hogar. Diseñada para familias que comparten una lista de gastos y necesitan visibilidad en tiempo real desde cualquier dispositivo.

---

## Resumen de funcionalidades

### 1. Registro de gastos

#### Formulario manual
Cada gasto registra los siguientes campos:
- Concepto, monto y moneda (MXN por defecto)
- Tipo: **gasto** o **ingreso**
- Naturaleza: **variable** o **fijo**
- Fecha de la transacción
- Quién pagó (miembro del espacio)
- Categoría (17 categorías de gastos + 8 de ingresos)
- Método de pago: efectivo, débito, crédito, transferencia
- Banco y últimos 4 dígitos de tarjeta
- Establecimiento y ubicación
- Meses sin intereses (MSI): cuántas parcialidades y en qué pago se está
- Flags opcionales: gasto compartido, reembolsable, deducible, requiere factura
- Notas y etiquetas libres

#### Ingreso por texto con IA
Escribe en lenguaje natural y la IA (Claude) interpreta el gasto:
- Ejemplo: _"Pagué 450 de gasolina con débito Banamex"_
- Detecta **múltiples gastos en un solo texto**: _"150 de pan, 80 de leche, 320 de carne"_
- Muestra una pantalla de revisión donde se puede seleccionar el espacio destino para cada gasto antes de guardar
- Fallback a modo manual si no hay API key configurada

#### Ingreso por foto de recibo
- Captura desde cámara o selección de imagen de galería
- La IA analiza el recibo y extrae **cada línea como un gasto independiente**
- Pantalla de revisión multi-gasto con selector de espacio por ítem
- Guarda la imagen del recibo asociada al gasto

---

### 2. Gastos fijos y checklist mensual

#### Plantillas de gastos fijos
Define recurrencias con:
- Frecuencia: diario, semanal, quincenal, mensual, bimestral, trimestral, semestral, anual
- Día de pago esperado (día del mes, día de la semana o mes del año según frecuencia)
- Monto esperado, categoría, método de pago, banco y tarjeta

#### Checklist mensual
- Genera automáticamente los compromisos del mes según las plantillas activas
- Cada ítem se puede marcar como **confirmado** (vinculado al gasto real), **omitido** o dejarlo **pendiente**
- Muestra progreso con barra de completado, totales esperados vs confirmados
- Filtros: todos / pendiente / confirmado / omitido
- Si se registra un gasto que coincide por concepto, categoría y monto, el checklist lo auto-vincula

#### Bandeja de pendientes
Tray flotante que muestra cuántos gastos fijos del mes actual aún no se han confirmado, con acceso rápido para registrarlos.

#### Notificaciones de vencimiento
Servicio de notificaciones que alerta días antes del vencimiento de un gasto fijo (configurable por plantilla). Funciona en segundo plano y se reactiva cuando la app vuelve al frente.

---

### 3. Visualizaciones y reportes

#### Dashboard
- Selector de rango: 3, 6 o 12 meses
- Gráfica de barras: gastos vs ingresos por mes
- Gráfica de pastel: distribución de gastos por categoría del mes seleccionado
- Gráfica de pastel: distribución de ingresos por categoría
- Gráfica de barras apiladas: gastos por miembro a lo largo del tiempo
- Top 5 conceptos más frecuentes del mes
- Tarjetas de resumen: total gastos, total ingresos, saldo neto, gasto promedio diario, desglose por miembro

#### Reporte mensual
- Selector de mes con todos los meses con datos
- Totales: gastos variables, gastos fijos, ingresos y saldo
- Desglose por categoría con porcentajes
- Desglose por miembro
- Listado completo de transacciones del mes
- **Exportación a CSV** con todos los campos (compatible con Excel/Sheets)

---

### 4. Espacios compartidos y miembros

#### Múltiples espacios
- Un usuario puede pertenecer a varios espacios (Casa, Departamento, Negocio, etc.)
- Selector de espacio visible desde la pantalla principal
- Al registrar un gasto por texto o foto, se puede asignar cada ítem a cualquier espacio

#### Miembros y roles
- **Propietario**: administra el espacio, invita miembros, puede eliminar datos
- **Editor**: registra y edita gastos
- **Lector**: solo visualiza (sin escritura)
- Cada miembro tiene nombre, color y PIN de 4 dígitos para cambiar de sesión
- Avatar con iniciales y color en el header para identificar quién está activo

#### Cambio de usuario
Tray deslizable para cambiar de miembro activo sin cerrar sesión, con confirmación por PIN.

---

### 5. Autenticación y sincronización en la nube

#### Magic link (sin contraseña)
- Inicio de sesión por correo electrónico: se envía un enlace que autentica directamente
- Sin contraseñas que recordar
- Sesión persistente en el dispositivo

#### Sincronización Supabase
- Datos almacenados en PostgreSQL con Row Level Security
- Cada usuario solo ve sus propios datos
- Sincronización automática al iniciar sesión
- Actualización optimista: la UI responde al instante, la nube se actualiza en segundo plano
- Funciona offline con los datos cacheados; sincroniza al recuperar internet

#### Códigos de invitación
- El propietario genera un código de 6 caracteres desde Configuración
- Válido 7 días, hasta 20 usos
- Compartir por botón de WhatsApp o copiar al portapapeles
- El invitado abre la app, ingresa el código, elige nombre y color → se une al espacio
- El propietario puede revocar el código en cualquier momento

---

### 6. Configuración del espacio

- Cambiar nombre del espacio
- Gestionar miembros: cambiar rol, cambiar color, eliminar
- Configurar API key de Claude para activar las funciones de IA
- Seleccionar moneda del espacio
- Panel de código de invitación (solo para propietarios con Supabase activo)

---

### 7. Panel de administración

Accesible solo para usuarios con rol `is_admin` en la base de datos:
- Total de usuarios registrados
- Usuarios activos en los últimos 7 días
- Conteo por plan: free, trial, premium
- Nuevos usuarios este mes
- Barra de distribución de planes
- Listado completo de usuarios con filtro por nombre/email, badge de plan y última actividad

---

### 8. App instalable (PWA)

- Se instala desde el navegador en Android e iOS sin app store
- Ícono propio en el menú de apps del dispositivo
- Se abre en pantalla completa sin barra del navegador (modo standalone)
- Service worker que cachea el shell de la app para carga instantánea
- Fuentes Google cacheadas localmente (CacheFirst)
- Peticiones a Supabase con estrategia NetworkFirst (datos siempre frescos cuando hay internet)

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Estilos | Tailwind CSS v4 |
| Gráficas | Recharts |
| Backend / Auth | Supabase (PostgreSQL + RLS + Auth) |
| IA / parsing | Anthropic Claude API (claude-haiku-4-5) |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel |

---

## Base de datos (Supabase)

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil de cada usuario autenticado |
| `spaces` | Espacios (listas de gastos) |
| `space_members` | Miembros de cada espacio con rol y color |
| `expenses` | Gastos e ingresos |
| `fixed_expense_templates` | Plantillas de gastos recurrentes |
| `fixed_expense_checks` | Estado mensual de cada plantilla |
| `space_settings` | Configuración por espacio (moneda, API key) |
| `space_invites` | Códigos de invitación activos |

Todas las tablas tienen **Row Level Security** habilitado. Funciones SQL con `security definer` para operaciones cross-RLS como preview e ingreso por código de invitación.

---

## Estructura del proyecto

```
expense-tracker/
├── public/
│   ├── icons/           # Íconos PWA (SVG + PNG 192/512)
│   └── apple-touch-icon.png
├── src/
│   ├── components/      # 25 componentes React
│   ├── hooks/           # useAuth, useExpenses, useFixedExpenses
│   ├── lib/             # supabase.ts, db.ts (CRUD layer)
│   ├── services/        # claudeService.ts, notificationService.ts
│   ├── types/           # expense.ts, fixedExpense.ts, space.ts
│   └── utils/           # storage, spaceStorage, fixedStorage
├── supabase/
│   ├── schema.sql       # Schema completo con RLS
│   └── add_invites.sql  # Tabla e RPCs de invitaciones
└── vercel.json          # Rewrite SPA para Vercel
```

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

La API key de Claude se configura por espacio desde la UI (Configuración → API Key). Si no está configurada, las funciones de IA se desactivan y la app funciona solo con formulario manual.

---

## Instalación local

```bash
git clone https://github.com/divan7/datasciencecoursera
cd datasciencecoursera/expense-tracker
npm install
cp .env.local.example .env.local   # Agrega tus claves de Supabase
npm run dev -- --host               # Expone en red local para pruebas en celular
```

---

## Deploy en Vercel

1. Importar repo en [vercel.com](https://vercel.com)
2. **Root Directory**: `expense-tracker`
3. **Framework**: Vite (autodetectado)
4. Agregar variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Deploy
6. Actualizar **Site URL** y **Redirect URLs** en Supabase Authentication con la URL de Vercel
