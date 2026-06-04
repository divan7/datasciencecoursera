"""
Servicio de automatización de navegador para portales de facturación.
Usa Playwright con guía visual de Claude (vision-guided automation).
"""

import asyncio
import base64
import json
import queue
import re
import threading
from typing import Callable, Optional

import anthropic


_STATUS_TIPOS = ("info", "success", "warning", "error", "user_action")

Mensaje = dict  # {"tipo": str, "texto": str}


class BrowserService:
    """
    Gestiona la automatización del navegador en un hilo secundario.
    Comunica progreso vía una cola thread-safe.
    """

    def __init__(self):
        self.cola: queue.Queue[Mensaje] = queue.Queue()
        self._hilo: Optional[threading.Thread] = None
        self._activo = False

    def iniciar_facturacion(
        self,
        url: str,
        fiscal_data: dict,
        ticket_data: dict,
        api_key: str,
    ) -> None:
        """Lanza la automatización en background."""
        self._activo = True
        self._hilo = threading.Thread(
            target=self._run_async,
            args=(url, fiscal_data, ticket_data, api_key),
            daemon=True,
        )
        self._hilo.start()

    def detener(self) -> None:
        self._activo = False

    def leer_mensajes(self) -> list[Mensaje]:
        msgs = []
        try:
            while True:
                msgs.append(self.cola.get_nowait())
        except queue.Empty:
            pass
        return msgs

    # ─── Privado ──────────────────────────────────────────────────────────────

    def _emit(self, tipo: str, texto: str) -> None:
        self.cola.put({"tipo": tipo, "texto": texto})

    def _run_async(self, url, fiscal_data, ticket_data, api_key):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(
                self._automatizar(url, fiscal_data, ticket_data, api_key)
            )
        except Exception as exc:
            self._emit("error", f"Error inesperado: {exc}")
        finally:
            loop.close()

    async def _automatizar(self, url: str, fiscal_data: dict, ticket_data: dict, api_key: str):
        try:
            from playwright.async_api import async_playwright, TimeoutError as PWTimeout
        except ImportError:
            self._emit("warning",
                       "Playwright no instalado. Abriendo navegador del sistema...")
            import webbrowser
            webbrowser.open(url)
            self._emit("user_action",
                       "El navegador se abrió manualmente. Por favor completa el formulario "
                       "de facturación con tus datos y regresa aquí cuando termines.")
            return

        self._emit("info", f"Abriendo portal: {url}")

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=False, slow_mo=300)
            ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await ctx.new_page()

            try:
                await page.goto(url, timeout=30_000)
                await page.wait_for_load_state("domcontentloaded", timeout=15_000)
            except Exception as exc:
                self._emit("warning", f"La página tardó en cargar: {exc}")

            client = anthropic.Anthropic(api_key=api_key)
            folio_fiscal_obtenido = None

            for paso in range(1, 16):
                if not self._activo:
                    self._emit("info", "Automatización detenida por el usuario.")
                    break

                await asyncio.sleep(1.0)
                screenshot_bytes = await page.screenshot(full_page=False)
                screenshot_b64 = base64.standard_b64encode(screenshot_bytes).decode()

                analisis = await self._analizar_pantalla(
                    client, screenshot_b64, fiscal_data, ticket_data, paso
                )

                estado = analisis.get("estado", "en_progreso")
                mensaje = analisis.get("mensaje", "")
                self._emit("info", f"Paso {paso}: {mensaje}")

                if estado == "completado":
                    folio_fiscal_obtenido = analisis.get("folio_fiscal")
                    msg = "¡Facturación completada exitosamente!"
                    if folio_fiscal_obtenido:
                        msg += f"\nFolio fiscal (UUID): {folio_fiscal_obtenido}"
                    self._emit("success", msg)
                    await asyncio.sleep(4)
                    break

                if estado == "requiere_usuario":
                    self._emit(
                        "user_action",
                        f"Se requiere tu intervención: {mensaje}\n"
                        "Por favor completa el proceso en el navegador y "
                        "confirma cuando obtengas la factura.",
                    )
                    # Mantener navegador abierto 3 minutos
                    await asyncio.sleep(180)
                    break

                # Ejecutar acciones sugeridas por Claude
                acciones = analisis.get("acciones", [])
                for accion in acciones:
                    if not self._activo:
                        break
                    try:
                        await self._ejecutar_accion(page, accion)
                        await asyncio.sleep(0.6)
                    except Exception as exc:
                        self._emit("warning", f"Acción fallida ({accion.get('descripcion', '')}): {exc}")

            else:
                self._emit(
                    "user_action",
                    "Se alcanzó el límite de pasos automáticos.\n"
                    "Por favor completa el proceso manualmente en el navegador.",
                )
                await asyncio.sleep(120)

            self._emit("_folio", folio_fiscal_obtenido or "")
            await browser.close()

    async def _analizar_pantalla(
        self, client: anthropic.Anthropic, screenshot_b64: str,
        fiscal_data: dict, ticket_data: dict, paso: int
    ) -> dict:
        fiscal_str = json.dumps(fiscal_data, ensure_ascii=False, indent=2)
        ticket_str = json.dumps(ticket_data, ensure_ascii=False, indent=2)

        prompt = f"""Estás automatizando un portal de facturación electrónica (CFDI 4.0) en México.
Este es el paso {paso} del proceso.

DATOS DEL RECEPTOR (usuario):
{fiscal_str}

DATOS DEL TICKET:
{ticket_str}

Analiza la pantalla actual y responde ÚNICAMENTE con JSON válido:

{{
  "estado": "en_progreso" | "completado" | "requiere_usuario",
  "mensaje": "descripción breve de la situación actual",
  "folio_fiscal": "UUID del CFDI si ya se generó (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), o null",
  "acciones": [
    {{
      "tipo": "fill" | "click" | "select" | "scroll" | "wait",
      "selector": "selector CSS o texto visible del elemento",
      "valor": "valor a ingresar (para fill/select)",
      "descripcion": "qué hace esta acción"
    }}
  ]
}}

Reglas:
- "completado": se descargó/envió la factura o se muestra el folio fiscal (UUID)
- "requiere_usuario": hay CAPTCHA, verificación humana, o no puedes avanzar
- "en_progreso": hay campos por llenar o botones por clickear
- Para campos RFC usa el valor: {fiscal_data.get("rfc", "")}
- Para campos nombre usa: {fiscal_data.get("nombre", "")}
- Para campos código postal usa: {fiscal_data.get("codigo_postal", "")}
- Para régimen fiscal busca el código: {fiscal_data.get("regimen_codigo", "")}
- Para uso CFDI usa: {fiscal_data.get("uso_cfdi", "G03")}
- Para email usa: {fiscal_data.get("email", "")}
- Para folio/ticket usa: {ticket_data.get("folio", "")}
- Los selectores deben ser CSS válidos o texto exacto del elemento
- Máximo 4 acciones por paso para no sobrecargar"""

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
                            "media_type": "image/png",
                            "data": screenshot_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
        )

        raw = response.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
        return {"estado": "en_progreso", "mensaje": "Analizando...", "acciones": []}

    async def _ejecutar_accion(self, page, accion: dict) -> None:
        tipo = accion.get("tipo", "")
        selector = accion.get("selector", "")
        valor = accion.get("valor", "")

        if tipo == "fill":
            try:
                await page.fill(selector, str(valor), timeout=5_000)
            except Exception:
                # Fallback: buscar por placeholder o label
                await page.get_by_placeholder(selector).fill(str(valor))

        elif tipo == "click":
            try:
                await page.click(selector, timeout=5_000)
            except Exception:
                await page.get_by_text(selector, exact=False).first.click()

        elif tipo == "select":
            try:
                await page.select_option(selector, value=str(valor), timeout=5_000)
            except Exception:
                try:
                    await page.select_option(selector, label=str(valor), timeout=5_000)
                except Exception:
                    pass

        elif tipo == "scroll":
            await page.evaluate("window.scrollBy(0, 300)")

        elif tipo == "wait":
            secs = float(valor) if valor else 1.0
            await asyncio.sleep(min(secs, 5.0))
