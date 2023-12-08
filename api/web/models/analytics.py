# analytics Endpoints

"""APIs for metrics"""
from typing import Any, Dict
from modules.types import PMObject


class DailyRunLogMetricInstance(PMObject):
    prompt_model_uuid: str
    prompt_model_name: str
    day: str
    total_cost: float
    avg_latency: float
    total_token_usage: Dict[str, Any]
    total_runs: int


class DailyChatLogMetricInstance(PMObject):
    project_name: str
    chat_model_uuid: str
    chat_model_name: str
    day: str
    total_cost: float
    avg_latency: float
    total_token_usage: Dict[str, Any]
    total_runs: int
