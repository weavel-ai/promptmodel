from typing import Dict, Optional
from modules.types import PMObject

class RunFunctionModelRequest(PMObject):
    name: str
    inputs: Optional[Dict[str, any]] = {}
    version: Optional[int] = None
    stream: Optional[bool] = False