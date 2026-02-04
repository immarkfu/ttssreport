from pydantic import BaseModel
from typing import Literal

class StockSignal(BaseModel):
    id: str
    code: str
    name: str
    industry: str
    price: float
    changePercent: float
    signalStrength: Literal['strong', 'medium', 'weak']
    displayFactor: str
    jValue: float
    macdValue: float
    volumeRatio: float
    redGreenRatio: float

class B1SignalListResponse(BaseModel):
    total: int
    data: list[StockSignal]

class TechnicalIndicators(BaseModel):
    jValue: float
    kValue: float
    dValue: float
    macd: float
    dif: float
    dea: float
    volumeRatio: float
    redGreenRatio: float

class B1SignalDetail(BaseModel):
    code: str
    name: str
    industry: str
    price: float
    changePercent: float
    signalStrength: Literal['strong', 'medium', 'weak']
    displayFactor: str
    technicalIndicators: TechnicalIndicators
    signalTime: str
