// URL base de la API — se sobreescribe en produccion con VITE_API_URL en el .env
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
