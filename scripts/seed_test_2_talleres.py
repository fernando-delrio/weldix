"""
Script puntual — NO forma parte del seed de producción.

Genera 2 talleres de prueba vía la API real (no toca la BD directamente),
cada uno con 10 operarios, ~32 OTs con estados variados, materiales en
stock consumidos por esas OTs, y entregas de EPI para los operarios.

Sirve para probar la app con un volumen de datos parecido al real antes
de grabar una demo o de dar acceso a un taller de verdad.

Uso:
    python scripts/seed_test_2_talleres.py                # contra localhost:8000
    python scripts/seed_test_2_talleres.py --prod          # contra api.weldix.es

Cada ejecución crea talleres NUEVOS (los emails de admin llevan un sufijo
de fecha/hora para no chocar con una ejecución anterior). Al final se
imprimen las credenciales de cada admin para poder entrar y mirar.
"""

import argparse
import random
import sys
from datetime import date, timedelta

import httpx

LOCAL_URL = "http://localhost:8000"
PROD_URL = "https://api.weldix.es"

OPERARIO_NOMBRES = [
    "Javier Morales", "Lucía Fernández", "Carlos Ibáñez", "Marta Sánchez",
    "Antonio Ruiz", "Elena Torres", "Miguel Ángel Ortega", "Sara Domínguez",
    "Pablo Navarro", "Cristina Vidal",
]

CLIENTES = [
    "Metalúrgica García S.L.", "Construcciones Hermanos Peña", "Talleres Ferroval",
    "Naves Industriales del Sur", "Estructuras Beltrán", "Aceros Cantábrico",
    "Calderería Ochoa e Hijos", "Grupo Montajes Ibérica", "Soldaduras Especiales Roca",
    "Industrias Marítimas Vento",
]

TIPOS_TRABAJO = [
    ("Soldadura estructura acero inox", "Inox · Caldereria"),
    ("Reparación depósito industrial", "Caldereria"),
    ("Fabricación barandilla galvanizada", "Perfil · Corte"),
    ("Montaje nave metálica", "Estructura"),
    ("Soldadura TIG tubería acero", "Inox · Tuberia"),
    ("Refuerzo estructural de pilares", "Estructura"),
    ("Fabricación escalera metálica", "Perfil · Corte"),
    ("Reparación maquinaria de planta", "Mantenimiento"),
    ("Corte y plegado de chapa", "Chapa"),
    ("Soldadura de bancada industrial", "Estructura"),
]

MATERIALES = [
    ("Varilla inox AWS E308L 2.4mm", "soldadura", "kg", 40, 10),
    ("Electrodo básico E7018 3.2mm", "soldadura", "kg", 60, 15),
    ("Perfil IPN 140", "perfil", "ud", 25, 5),
    ("Chapa acero S275 3mm", "chapa", "m2", 30, 8),
    ("Tornillería M10 galvanizada", "tornilleria", "ud", 500, 100),
    ("Disco de corte 230mm", "consumible", "ud", 50, 10),
    ("Gas Argón botella", "consumible", "ud", 6, 2),
    ("Guantes de soldador", "epi", "ud", 20, 5),
]

TIPOS_EPI = ["casco", "guantes", "botas", "gafas", "ropa", "proteccion_auditiva"]

ESTADO_CHAIN = ["pendiente", "en_proceso", "control", "listo", "entregado"]

# Distribución de las 32 OTs por estado final (índices sobre ESTADO_CHAIN)
DISTRIBUCION_ESTADOS = (
    ["pendiente"] * 10 + ["en_proceso"] * 8 + ["control"] * 6
    + ["listo"] * 5 + ["entregado"] * 3
)


def crear_taller(client: httpx.Client, nombre: str, run_id: str) -> dict:
    email = f"admin.{run_id}@{nombre.lower().replace(' ', '')}-seed.com"
    password = "TallerTest2026!"
    resp = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": nombre,
            "admin_email": email,
            "admin_password": password,
            "admin_name": "Admin de Prueba",
            "aceptar_terminos": True,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    print(f"  Taller creado: {nombre} - admin: {email} / {password}")
    return {"token": data["access_token"], "email": email, "password": password}


def crear_operarios(client: httpx.Client, headers: dict, run_id: str, slug: str) -> list[dict]:
    operarios = []
    for i, nombre in enumerate(OPERARIO_NOMBRES):
        email = f"operario{i}.{run_id}@{slug}-seed.com"
        password = "OperarioTest2026!"
        resp = client.post(
            "/auth/admin/signup",
            headers=headers,
            json={
                "email": email,
                "full_name": nombre,
                "password": password,
                "role": "operario",
            },
        )
        resp.raise_for_status()
        operarios.append(resp.json())
    print(f"  {len(operarios)} operarios creados")
    return operarios


def crear_stock(client: httpx.Client, headers: dict) -> list[dict]:
    materiales = []
    for name, category, unit, quantity, minimum in MATERIALES:
        resp = client.post(
            "/stock",
            headers=headers,
            json={
                "name": name,
                "category": category,
                "unit": unit,
                "quantity": quantity,
                "minimum": minimum,
            },
        )
        resp.raise_for_status()
        materiales.append(resp.json())
    print(f"  {len(materiales)} materiales creados en stock")
    return materiales


def avanzar_estado(client: httpx.Client, headers: dict, job_id: int, estado_final: str) -> None:
    """Recorre la cadena de estados en orden hasta llegar al estado pedido."""
    idx_final = ESTADO_CHAIN.index(estado_final)
    for estado in ESTADO_CHAIN[1 : idx_final + 1]:
        resp = client.patch(
            f"/trabajos/{job_id}/estado", headers=headers, json={"estado": estado}
        )
        resp.raise_for_status()


def crear_jobs(
    client: httpx.Client, headers: dict, operarios: list[dict], materiales: list[dict]
) -> None:
    estados = DISTRIBUCION_ESTADOS.copy()
    random.shuffle(estados)

    for i, estado_final in enumerate(estados):
        titulo, tipo_area = random.choice(TIPOS_TRABAJO)
        cliente = random.choice(CLIENTES)
        fecha_inicio = date.today() - timedelta(days=random.randint(0, 20))

        resp = client.post(
            "/trabajos",
            headers=headers,
            json={
                "titulo": f"{titulo} ({tipo_area})",
                "cliente": cliente,
                "descripcion": f"OT de prueba #{i + 1} generada por script de seed.",
                "fecha_inicio": fecha_inicio.isoformat(),
            },
        )
        resp.raise_for_status()
        job = resp.json()

        if estado_final != "pendiente":
            operario = random.choice(operarios)
            client.patch(
                f"/trabajos/{job['id']}", headers=headers,
                json={"operario_id": operario["id"]},
            ).raise_for_status()
            avanzar_estado(client, headers, job["id"], estado_final)

        # Consumo de stock en ~2 de cada 3 OTs, para simular uso real de materiales
        if random.random() < 0.66:
            material = random.choice(materiales)
            consumo = round(random.uniform(0.5, 4.0), 1)
            client.post(
                f"/stock/{material['id']}/consume", headers=headers,
                json={"consumed": consumo},
            )

    print(f"  {len(estados)} OTs creadas y repartidas en sus estados")


def crear_epis(client: httpx.Client, headers: dict, operarios: list[dict]) -> None:
    total = 0
    for operario in operarios:
        for tipo_epi in random.sample(TIPOS_EPI, k=random.randint(1, 3)):
            fecha_entrega = date.today() - timedelta(days=random.randint(10, 200))
            fecha_caducidad = fecha_entrega + timedelta(days=365)
            resp = client.post(
                "/rrhh/epis",
                headers=headers,
                json={
                    "operario_id": operario["id"],
                    "tipo_epi": tipo_epi,
                    "cantidad": 1,
                    "fecha_entrega": fecha_entrega.isoformat(),
                    "fecha_caducidad": fecha_caducidad.isoformat(),
                },
            )
            resp.raise_for_status()
            total += 1
    print(f"  {total} entregas de EPI registradas")


def crear_taller_completo(client: httpx.Client, nombre: str, run_id: str) -> dict:
    print(f"\n--- {nombre} ---")
    slug = nombre.lower().replace(" ", "")
    admin = crear_taller(client, nombre, run_id)
    headers = {"Authorization": f"Bearer {admin['token']}"}
    operarios = crear_operarios(client, headers, run_id, slug)
    materiales = crear_stock(client, headers)
    crear_jobs(client, headers, operarios, materiales)
    crear_epis(client, headers, operarios)
    return admin


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--prod", action="store_true", help="Ejecutar contra api.weldix.es en vez de local"
    )
    args = parser.parse_args()

    base_url = PROD_URL if args.prod else LOCAL_URL
    run_id = f"{date.today().isoformat()}-{random.randint(1000, 9999)}"

    print(f"Generando datos de prueba contra: {base_url}")
    print(f"Run id: {run_id}\n")

    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        admins = [
            crear_taller_completo(client, "Taller Demo Norte", run_id),
            crear_taller_completo(client, "Taller Demo Sur", run_id),
        ]

    print("\n=== Listo ===")
    for admin in admins:
        print(f"  {admin['email']} / {admin['password']}")


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPStatusError as exc:
        print(f"\nError HTTP {exc.response.status_code}: {exc.response.text}", file=sys.stderr)
        sys.exit(1)
