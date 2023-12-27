from typing import Optional, List, Dict, Any, Union, Tuple
from datetime import datetime
from sqlalchemy import (
    Column,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4, UUID as UUIDType
from sqlalchemy.sql import func, text
from base.database import Base


class ParsingType(Base):
    __tablename__ = "parsing_type"

    type: str = Column(Text, primary_key=True, unique=True)
