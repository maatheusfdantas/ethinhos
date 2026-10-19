"""
Ethos Analytics FastAPI Service
Exposes RESTful endpoints for real-time metric calculation.
"""

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine.models import HabitModel, CheckinModel
from engine.service import run_analytics, run_analytics_for_user

app = FastAPI(
    title="Ethos Analytics Engine",
    description="Python Data Science engine for behavioral metrics, streaks, and Garmin-style dashboards.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ComputePayload(BaseModel):
    habits: List[HabitModel]
    checkins: List[CheckinModel]
    reference_date: Optional[str] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Ethos Analytics Engine",
        "version": "1.0.0"
    }

@app.get("/analytics/{user_id}")
def get_user_analytics(user_id: str):
    try:
        data = run_analytics_for_user(user_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar telemetria do usuário: {str(e)}")

@app.post("/analytics/compute")
def compute_analytics(payload: ComputePayload):
    try:
        data = run_analytics(payload.habits, payload.checkins)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro no cálculo da engine: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
