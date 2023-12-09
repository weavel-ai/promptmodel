from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.dialects.postgresql import UUID as PGUUID


class LocalTaskErrorType(str, Enum):
    NO_FUNCTION_NAMED_ERROR = "NO_FUNCTION_NAMED_ERROR"  # no DB update is needed
    FUNCTION_CALL_FAILED_ERROR = "FUNCTION_CALL_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog
    PARSING_FAILED_ERROR = "PARSING_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog

    SERVICE_ERROR = "SERVICE_ERROR"  # no DB update is needed


class InstanceType(str, Enum):
    ChatLog = "ChatLog"
    RunLog = "RunLog"
    ChatLogSession = "ChatLogSession"


class PMObject(BaseModel):
    def __init__(self, **data: Any):
        for key, value in data.items():
            if key in self.__annotations__ and self.__annotations__[key] == str:
                if (
                    isinstance(value, UUID)
                    or isinstance(value, PGUUID)
                    or isinstance(value, datetime)
                    or isinstance(value, date)
                ):
                    try:
                        data[key] = str(value)
                    except:
                        data[key] = value
        super().__init__(**data)
