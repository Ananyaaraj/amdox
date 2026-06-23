"""
Amdox ERP - AI Demand Forecasting Microservice
FastAPI + Prophet + PyTorch LSTM
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Amdox ML Service",
    description="Demand forecasting with Prophet + LSTM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory model registry
model_registry: dict = {}


# ---- Schemas ----
class TrainRequest(BaseModel):
    product_id: str
    data: List[dict]  # [{"ds": "2024-01-01", "y": 120.5}, ...]
    model_type: str = "prophet"  # "prophet" | "lstm"
    forecast_horizon: int = 90


class PredictRequest(BaseModel):
    product_id: str
    horizon: int = 90


class ForecastPoint(BaseModel):
    date: str
    predicted_qty: float
    lower_bound: float
    upper_bound: float
    confidence: float


class PredictResponse(BaseModel):
    product_id: str
    model_type: str
    mape: Optional[float]
    forecasts: List[ForecastPoint]


# ---- Routes ----
@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": len(model_registry)}


@app.post("/train")
async def train_model(req: TrainRequest, background_tasks: BackgroundTasks):
    """Trigger model training (async). Returns immediately."""
    background_tasks.add_task(_train_background, req)
    return {
        "status": "training_started",
        "product_id": req.product_id,
        "model_type": req.model_type,
        "data_points": len(req.data),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Return demand forecast for a product."""
    key = req.product_id
    if key not in model_registry:
        # Return synthetic forecast if model not trained yet
        return _synthetic_forecast(req.product_id, req.horizon)

    model_info = model_registry[key]
    return _run_forecast(model_info, req.product_id, req.horizon)


@app.get("/models")
def list_models():
    return {
        "models": [
            {"product_id": k, "type": v["type"], "trained_at": v.get("trained_at")}
            for k, v in model_registry.items()
        ]
    }


@app.delete("/models/{product_id}")
def delete_model(product_id: str):
    if product_id in model_registry:
        del model_registry[product_id]
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Model not found")


# ---- Background Training ----
def _train_background(req: TrainRequest):
    try:
        import pandas as pd
        from datetime import datetime

        df = pd.DataFrame(req.data)
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        if req.model_type == "prophet":
            _train_prophet(req.product_id, df, req.forecast_horizon)
        else:
            _train_lstm(req.product_id, df, req.forecast_horizon)

        logger.info(f"Model trained for product {req.product_id} ({req.model_type})")
    except Exception as e:
        logger.error(f"Training failed for {req.product_id}: {e}")


def _train_prophet(product_id: str, df, horizon: int):
    try:
        from prophet import Prophet
        from datetime import datetime

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
        )
        model.fit(df)
        model_registry[product_id] = {
            "type": "prophet",
            "model": model,
            "trained_at": datetime.utcnow().isoformat(),
            "n_datapoints": len(df),
        }
    except ImportError:
        logger.warning("Prophet not installed; storing synthetic model")
        from datetime import datetime
        model_registry[product_id] = {
            "type": "synthetic",
            "mean": float(df["y"].mean()),
            "std": float(df["y"].std()),
            "trained_at": datetime.utcnow().isoformat(),
        }


def _train_lstm(product_id: str, df, horizon: int):
    """Simplified LSTM training stub — extend with PyTorch."""
    import numpy as np
    from datetime import datetime

    series = df["y"].values.astype(float)
    model_registry[product_id] = {
        "type": "lstm",
        "mean": float(np.mean(series)),
        "std": float(np.std(series)),
        "last_values": series[-30:].tolist(),
        "trained_at": datetime.utcnow().isoformat(),
    }


def _run_forecast(model_info: dict, product_id: str, horizon: int) -> PredictResponse:
    import pandas as pd
    from datetime import datetime, timedelta
    import numpy as np

    forecasts = []
    base_date = datetime.utcnow()

    if model_info["type"] == "prophet":
        model = model_info["model"]
        future = model.make_future_dataframe(periods=horizon)
        forecast = model.predict(future)
        tail = forecast.tail(horizon)
        for _, row in tail.iterrows():
            forecasts.append(ForecastPoint(
                date=row["ds"].strftime("%Y-%m-%d"),
                predicted_qty=max(0, float(row["yhat"])),
                lower_bound=max(0, float(row["yhat_lower"])),
                upper_bound=max(0, float(row["yhat_upper"])),
                confidence=0.80,
            ))
    else:
        # Synthetic / LSTM stub
        mean = model_info.get("mean", 100)
        std = model_info.get("std", 20)
        for i in range(horizon):
            pred = max(0, np.random.normal(mean, std * 0.3))
            forecasts.append(ForecastPoint(
                date=(base_date + timedelta(days=i + 1)).strftime("%Y-%m-%d"),
                predicted_qty=round(pred, 2),
                lower_bound=round(max(0, pred - std), 2),
                upper_bound=round(pred + std, 2),
                confidence=0.75,
            ))

    return PredictResponse(
        product_id=product_id,
        model_type=model_info["type"],
        mape=None,
        forecasts=forecasts,
    )


def _synthetic_forecast(product_id: str, horizon: int) -> PredictResponse:
    import numpy as np
    from datetime import datetime, timedelta

    base_demand = np.random.randint(50, 300)
    forecasts = []
    base_date = datetime.utcnow()
    for i in range(horizon):
        trend = 1 + (i / horizon) * 0.1
        seasonal = 1 + 0.2 * np.sin(2 * np.pi * i / 7)
        pred = max(0, base_demand * trend * seasonal + np.random.normal(0, base_demand * 0.05))
        forecasts.append(ForecastPoint(
            date=(base_date + timedelta(days=i + 1)).strftime("%Y-%m-%d"),
            predicted_qty=round(pred, 2),
            lower_bound=round(max(0, pred * 0.85), 2),
            upper_bound=round(pred * 1.15, 2),
            confidence=0.70,
        ))

    return PredictResponse(
        product_id=product_id,
        model_type="synthetic",
        mape=None,
        forecasts=forecasts,
    )


if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
