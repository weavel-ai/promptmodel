# analytics Endpoints

"""APIs for metrics"""
from typing import Any, Dict, Optional
from modules.types import PMObject


class ProjectDailyRunLogMetricInstance(PMObject):
    project_uuid: str
    day: str
    total_cost: Optional[float] = None
    avg_latency: Optional[float] = None
    total_token_usage: Optional[int] = None
    total_runs: int
    run_from_deployment: bool


class DailyRunLogMetricInstance(PMObject):
    function_model_uuid: str
    function_model_name: str
    day: str
    total_cost: Optional[float] = None
    avg_latency: Optional[float] = None
    total_token_usage: Optional[int] = None
    total_prompt_tokens: Optional[int] = None
    total_completion_tokens: Optional[int] = None
    total_runs: int


class DailyChatLogMetricInstance(PMObject):
    project_name: str
    chat_model_uuid: str
    chat_model_name: str
    day: str
    total_cost: Optional[float] = None
    avg_latency: Optional[float] = None
    total_token_usage: Optional[int] = None
    total_chat_sessions: int
