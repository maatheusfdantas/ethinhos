"""
Data Models for the Ethos Analytics Engine.
Matches the official architectural specification.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

MetricType = Literal["binary", "count", "duration", "quantity", "free_event"]
ScheduleType = Literal["daily", "weekdays", "custom", "weekly"]
OccurrenceStatus = Literal["done", "partial", "missed", "skipped_justified", "late_done", "not_logged"]
TrendStatus = Literal["improving", "stable", "declining"]
ConsistencyLabel = Literal["muito consistente", "consistente", "oscilando", "precisa de ajuste", "rotina fragilizada"]

class HabitModel(BaseModel):
    habit_id: str
    name: str
    category: str = "Geral"
    metric_type: MetricType = "binary"
    target_value: float = 1.0
    target_unit: str = "vezes"
    schedule_type: ScheduleType = "daily"
    schedule_days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Mon or 0=Sun (standardized 0=Sun..6=Sat or 0=Mon..6=Sun)
    start_date: str = "2026-09-01"
    active: bool = True
    priority_weight: float = 1.0
    grace_window_minutes: int = 180

class CheckinModel(BaseModel):
    checkin_id: str
    habit_id: str
    event_date: str  # YYYY-MM-DD
    logged_at: Optional[str] = None
    value: float = 1.0
    status_override: Optional[OccurrenceStatus] = None
    note: Optional[str] = None

class ExpectedOccurrence(BaseModel):
    habit_id: str
    habit_name: str
    category: str
    expected_date: str  # YYYY-MM-DD
    target_value: float
    schedule_type: str
    status: OccurrenceStatus = "not_logged"
    logged_value: float = 0.0
    progress_ratio: float = 0.0
    completion_flag: int = 0
    note: Optional[str] = None

class HabitMetricResult(BaseModel):
    habit_id: str
    name: str
    category: str
    completion_rate: float
    current_streak: int
    best_streak: int
    regularity: float
    logging_reliability: float
    recovery_rate: float
    trend_delta: float
    trend_status: TrendStatus
    is_at_risk: bool = False
    status_label: str = "Normal"

class CategoryMetricResult(BaseModel):
    category: str
    adherence: float
    total_expected: int
    total_completed: int
    habits_count: int

class SummaryResult(BaseModel):
    consistency_score: float
    label: ConsistencyLabel
    description: str
    main_streak: int
    best_streak: int
    daily_progress: float
    completion_rate: float
    trend_status: TrendStatus
    trend_delta: float
    logging_reliability: float
    recovery_rate: float
    variability: float

class HighlightsResult(BaseModel):
    top_strength: str
    top_risk: str
    suggested_action: str

class DiagnosticAlert(BaseModel):
    type: str  # decline, risk, conflict, reliability, instability
    habit_id: Optional[str] = None
    title: str
    text: str

class QuickReport(BaseModel):
    consistency_score: float
    label: str
    weekly_progress: float
    main_streak: int
    top_strength: str
    top_risk: str
    suggested_action: str
    summary_text: str

class ExpandedReport(BaseModel):
    summary_paragraph: str
    negative_factors: List[str]
    practical_suggestions: List[str]
    ranking: List[Dict[str, Any]]

class AnalyticalReport(BaseModel):
    window_7d: Dict[str, float]
    window_30d: Dict[str, float]
    window_90d: Dict[str, float]
    deep_explanation: str
    adaptive_recommendations: List[str]

class AnalyticsResponse(BaseModel):
    summary: SummaryResult
    highlights: HighlightsResult
    alerts: List[DiagnosticAlert]
    habits: List[HabitMetricResult]
    categories: List[CategoryMetricResult]
    reports: Dict[str, Any]
    charts: Dict[str, Any]
