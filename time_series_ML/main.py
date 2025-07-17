import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd
from prophet import Prophet

class DataPoint(BaseModel):
    date: str = Field(..., description="ISO date string, e.g. '2025-01-31'")
    balance: float

class ForecastRequest(BaseModel):
    data: List[DataPoint]
    periods: int = Field(12, description="How many future periods to forecast")
    freq: str = Field("M", description="Pandas frequency, e.g. 'D','W','M'")
    target: float = Field(..., description="Savings goal to project")

class ForecastPoint(BaseModel):
    date: str
    yhat: float
    yhat_lower: float
    yhat_upper: float

class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    target_date: Optional[str] = Field(
        None,
        description="First date when forecast yhat ≥ target; null if not reached in horizon"
    )

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Savings Forecast API (XGBoost + CORS)")

# 1) Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Or ["*"] to allow any origin
    allow_credentials=True,
    allow_methods=["*"],  # ← this allows OPTIONS, GET, POST, etc.
    allow_headers=["*"],  # ← accepts e.g. Content-Type
)

# 2) Then define your schemas and /forecast endpoint as before
@app.post("/forecast", response_model=ForecastResponse)
def forecast_savings(req: ForecastRequest):
    try:
        # 1. Load & prepare
        df = pd.DataFrame([d.dict() for d in req.data])
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        prophet_df = df.rename(columns={"date": "ds", "balance": "y"})
        
        # 2. Fit Prophet
        m = Prophet(
            yearly_seasonality=False,
            # monthly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False
        )
        # add a custom “monthly” seasonality (≈30.5-day period)
        # m.add_seasonality(
        #     name='monthly',
        #     period=7,         # average days in a month
        #     fourier_order=2      # controls smoothness/complexity
        # )
        m.fit(prophet_df)
        
        # 3. Make future frame & predict
        future = m.make_future_dataframe(periods=req.periods, freq=req.freq)
        fcst = m.predict(future)
        
        # 4. Serialize forecast
        forecast_list = []
        for row in fcst[["ds", "yhat", "yhat_lower", "yhat_upper"]].itertuples():
            forecast_list.append(ForecastPoint(
                date=row.ds.strftime("%Y-%m-%d"),
                yhat=round(row.yhat, 2),
                yhat_lower=round(row.yhat_lower, 2),
                yhat_upper=round(row.yhat_upper, 2),
            ))
        
        # 5. Find target date
        hit = fcst[fcst["yhat"] >= req.target]
        target_date = None
        if not hit.empty:
            target_date = hit.iloc[0]["ds"].strftime("%Y-%m-%d")
        
        return ForecastResponse(forecast=forecast_list, target_date=target_date)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing request: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)