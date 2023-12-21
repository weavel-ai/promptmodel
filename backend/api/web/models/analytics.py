# analytics Endpoints

"""APIs for metrics"""
from typing import Any, Dict, Optional
from modules.types import PMObject


class DailyRunLogMetricInstance(PMObject):
    function_model_uuid: str
    function_model_name: str
    day: str
    total_cost: Optional[float]
    avg_latency: Optional[float]
    total_token_usage: Dict[str, Any]
    total_runs: int


class DailyChatLogMetricInstance(PMObject):
    project_name: str
    chat_model_uuid: str
    chat_model_name: str
    day: str
    total_cost: Optional[float]
    avg_latency: Optional[float]
    total_token_usage: Optional[int]
    total_chat_sessions: int
