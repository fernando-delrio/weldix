"""
Utilidad de caché en memoria con TTL (Time To Live).

Por qué existe este módulo y no usamos una librería externa:
- En dev usamos SQLite, no Redis. No tiene sentido una dependencia pesada.
- El único caso de uso actual es cachear festivos nacionales (cambian una vez al año).
- Un dict + timestamp es suficiente para ese caso.

Concepto clave: el decorador `ttl_cache` envuelve cualquier función y almacena
su resultado en `_cache`. Si se llama de nuevo antes de que expire `ttl_seconds`,
devuelve el resultado guardado sin ejecutar la función original.
"""

import time
from functools import wraps
from typing import Any

# Almacén global: clave → (valor, timestamp_expiracion)
_cache: dict[str, tuple[Any, float]] = {}


def ttl_cache(ttl_seconds: int = 3600):
    """
    Decorador que cachea el resultado de una función durante `ttl_seconds`.

    Uso:
        @ttl_cache(ttl_seconds=3600)
        def funcion_cara(arg1, arg2):
            ...

    La clave de caché se construye con el nombre de la función + sus argumentos,
    por lo que llamadas con distintos argumentos se cachean por separado.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Construir clave única para esta combinación de función + argumentos
            key = f"{func.__qualname__}:{args}:{sorted(kwargs.items())}"
            now = time.monotonic()

            # Si existe en caché y no ha expirado, devolver el valor guardado
            if key in _cache:
                valor, expira_en = _cache[key]
                if now < expira_en:
                    return valor

            # Ejecutar la función real y guardar el resultado
            resultado = func(*args, **kwargs)
            _cache[key] = (resultado, now + ttl_seconds)
            return resultado

        def invalidate(*args, **kwargs):
            """Elimina manualmente una entrada de la caché (útil en tests)."""
            key = f"{func.__qualname__}:{args}:{sorted(kwargs.items())}"
            _cache.pop(key, None)

        wrapper.invalidate = invalidate
        return wrapper

    return decorator


def clear_cache() -> None:
    """Vacía toda la caché. Usado principalmente en tests."""
    _cache.clear()
