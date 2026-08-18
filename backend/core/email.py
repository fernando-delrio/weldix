"""
Servicio de email transaccional con Resend.
Si RESEND_API_KEY no está configurada, las funciones no hacen nada (no rompen el flujo).
"""

from datetime import datetime, timezone

import resend

from backend.core.config import settings

# Precios mostrados en los emails. Fuente de verdad: backend/features/billing/schemas.py
# (mismo modelo que la landing). Mantener sincronizados hasta unificarlos en config.
PRECIO_BASE = 49
PRECIO_POR_OPERARIO = 17

# ── Throttle en memoria (se resetea al reiniciar el servidor) ────────────────
# Evita enviar el email de warning más de una vez por día por taller
_warning_sent: dict[int, datetime] = {}

# Evita enviar el email de expirado más de una vez por sesión de servidor
_expired_sent: set[int] = set()


def _available() -> bool:
    return bool(settings.resend_api_key)


def _send(to: str, subject: str, html: str) -> None:
    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
    except Exception:
        pass  # El email falla silenciosamente — nunca rompe el flujo principal


# ── Email 0: Recuperación de contraseña ───────────────────────────────────────


def send_password_reset_email(to: str, reset_link: str) -> bool:
    """
    Envía el enlace de recuperación por Resend. Devuelve True si se intentó el
    envío (Resend configurado) y False si no hay canal de email disponible —
    el llamador puede usar ese False para avisar de que no llegó nada.
    """
    if not _available():
        return False
    _send(
        to=to,
        subject="Restablece tu contraseña de Weldix",
        html=_password_reset_html(reset_link),
    )
    return True


def _password_reset_html(reset_link: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;">

        <tr><td style="background:#f59e0b;padding:24px 32px;">
          <span style="font-size:24px;font-weight:900;color:#020617;letter-spacing:3px;">WELDIX</span>
        </td></tr>

        <tr><td style="padding:40px 32px;">
          <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">Restablece tu contraseña</h1>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Pulsa el botón para elegir una nueva. El enlace caduca en <strong style="color:#f1f5f9;">1 hora</strong>.
          </p>

          <a href="{reset_link}"
             style="display:inline-block;background:#f59e0b;color:#020617;font-weight:700;
                    font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">
            Elegir nueva contraseña →
          </a>

          <p style="color:#475569;font-size:13px;margin:28px 0 0;line-height:1.6;">
            Si no fuiste tú, ignora este email — tu contraseña actual sigue siendo válida.
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">
            Weldix · Gestión digital para talleres metalúrgicos
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


# ── Email 1: Bienvenida ───────────────────────────────────────────────────────


def send_welcome_email(to: str, admin_name: str, tenant_nombre: str) -> None:
    if not _available():
        return
    name = admin_name or "Admin"
    _send(
        to=to,
        subject=f"Bienvenido a Weldix — {tenant_nombre} está listo",
        html=_welcome_html(name, tenant_nombre),
    )


def _welcome_html(name: str, tenant_nombre: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#f59e0b;padding:24px 32px;">
          <span style="font-size:24px;font-weight:900;color:#020617;letter-spacing:3px;">WELDIX</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 32px;">
          <h1 style="color:#f1f5f9;font-size:22px;margin:0 0 16px;">
            Bienvenido, {name} 👋
          </h1>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Tu taller <strong style="color:#f1f5f9;">{tenant_nombre}</strong> ya está en marcha.
            Tienes <strong style="color:#f59e0b;">15 días de prueba gratuita</strong> con acceso
            completo a todos los módulos.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr>
              <td style="background:#1e293b;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 4px 4px 0;">
                <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;">Lo que puedes hacer ahora:</p>
                <ul style="color:#f1f5f9;font-size:14px;margin:4px 0;padding-left:20px;line-height:2;">
                  <li>Crear tu primera Orden de Trabajo</li>
                  <li>Añadir operarios a tu equipo</li>
                  <li>Registrar el stock del taller</li>
                  <li>Instalar Weldix en tablet (PWA)</li>
                </ul>
              </td>
            </tr>
          </table>

          <a href="{settings.frontend_url}/app"
             style="display:inline-block;background:#f59e0b;color:#020617;font-weight:700;
                    font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">
            Acceder a mi taller →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">
            Weldix · Gestión digital para talleres metalúrgicos<br>
            Si no creaste esta cuenta, ignora este email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


# ── Email 2: Aviso de trial a punto de vencer ─────────────────────────────────


def send_trial_warning_email(
    to: str, admin_name: str, tenant_nombre: str, days_left: int, tenant_id: int
) -> None:
    if not _available():
        return

    last = _warning_sent.get(tenant_id)
    if last and (datetime.now(timezone.utc) - last).total_seconds() < 86400:
        return  # ya enviado en las últimas 24h

    _warning_sent[tenant_id] = datetime.now(timezone.utc)
    name = admin_name or "Admin"
    _send(
        to=to,
        subject=f"Tu prueba de Weldix vence en {days_left} días",
        html=_warning_html(name, tenant_nombre, days_left),
    )


def _warning_html(name: str, tenant_nombre: str, days_left: int) -> str:
    urgency_color = "#ef4444" if days_left <= 1 else "#f59e0b"
    return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;">

        <tr><td style="background:#f59e0b;padding:24px 32px;">
          <span style="font-size:24px;font-weight:900;color:#020617;letter-spacing:3px;">WELDIX</span>
        </td></tr>

        <tr><td style="padding:40px 32px;">
          <div style="background:{urgency_color}20;border:1px solid {urgency_color};border-radius:6px;
                      padding:16px 20px;margin:0 0 28px;">
            <p style="color:{urgency_color};font-size:16px;font-weight:700;margin:0;">
              ⏰ Tu periodo de prueba vence en {days_left} día{"s" if days_left != 1 else ""}
            </p>
          </div>

          <p style="color:#f1f5f9;font-size:15px;margin:0 0 8px;">Hola {name},</p>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 28px;">
            La prueba gratuita de <strong style="color:#f1f5f9;">{tenant_nombre}</strong> en Weldix
            está a punto de vencer. Para no perder el acceso, activa tu plan ahora.
          </p>

          <a href="{settings.frontend_url}/trial-expirado"
             style="display:inline-block;background:#f59e0b;color:#020617;font-weight:700;
                    font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">
            Activar plan →
          </a>

          <p style="color:#475569;font-size:13px;margin:28px 0 0;">
            ¿Tienes preguntas? Escríbenos a
            <a href="mailto:hola@weldix.es" style="color:#f59e0b;">hola@weldix.es</a>
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">
            Weldix · Gestión digital para talleres metalúrgicos
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


# ── Email 3: Trial expirado ───────────────────────────────────────────────────


def send_trial_expired_email(
    to: str, admin_name: str, tenant_nombre: str, tenant_id: int
) -> None:
    if not _available():
        return
    if tenant_id in _expired_sent:
        return  # ya enviado en esta sesión del servidor

    _expired_sent.add(tenant_id)
    name = admin_name or "Admin"
    _send(
        to=to,
        subject="Tu prueba de Weldix ha expirado",
        html=_expired_html(name, tenant_nombre),
    )


def _expired_html(name: str, tenant_nombre: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;">

        <tr><td style="background:#ef4444;padding:24px 32px;">
          <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:3px;">WELDIX</span>
        </td></tr>

        <tr><td style="padding:40px 32px;">
          <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px;">
            Tu periodo de prueba ha finalizado
          </h1>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Hola {name}, la prueba gratuita de
            <strong style="color:#f1f5f9;">{tenant_nombre}</strong> ha expirado.
            Tus datos están guardados — activa tu plan para recuperar el acceso completo.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;">
            <tr>
              <td style="background:#1e293b;padding:20px 24px;border-radius:6px;">
                <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Tu plan</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#f1f5f9;font-size:14px;padding:6px 0;">
                      <strong style="color:#f59e0b;">{PRECIO_BASE}€/mes</strong> de base
                      + <strong style="color:#f59e0b;">{PRECIO_POR_OPERARIO}€</strong> por operario
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#94a3b8;font-size:13px;padding:6px 0;">
                      Todos los módulos incluidos · sin permanencia
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <a href="{settings.frontend_url}/trial-expirado"
             style="display:inline-block;background:#f59e0b;color:#020617;font-weight:700;
                    font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">
            Activar mi plan →
          </a>

          <p style="color:#475569;font-size:13px;margin:28px 0 0;">
            ¿Necesitas ayuda? Escríbenos a
            <a href="mailto:hola@weldix.es" style="color:#f59e0b;">hola@weldix.es</a>
            o por WhatsApp.
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:0;">
            Weldix · Gestión digital para talleres metalúrgicos
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""
