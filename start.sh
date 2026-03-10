#!/bin/bash
# Arranca backend y frontend desde la raíz del proyecto
# Uso: ./start.sh

source .venv/Scripts/activate

echo "▶ Arrancando backend en http://127.0.0.1:8000 ..."
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "▶ Arrancando frontend en http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend  → http://127.0.0.1:8000"
echo "✓ Frontend → http://localhost:5173"
echo ""
echo "Pulsa Ctrl+C para parar todo."

# Al hacer Ctrl+C, matar ambos procesos
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait
