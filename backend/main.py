"""
Anti-Discovery Engine — FastAPI backend entry point.
"""
import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so relative imports work
_backend = Path(__file__).parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from api.routes_graph import router as graph_router
from api.routes_gaps import router as gaps_router
from api.routes_historical import router as historical_router
from api.routes_inversions import router as inversions_router
from api.routes_persistence import router as persistence_router

app = FastAPI(
    title="Anti-Discovery Engine",
    version="0.1.0",
    description="Find structural gaps in the human knowledge graph.",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(graph_router)
app.include_router(gaps_router)
app.include_router(historical_router)
app.include_router(inversions_router)
app.include_router(persistence_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
