"""Postgres SQL Database Session."""
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from settings import Settings

settings = Settings()

username = settings.POSTGRES_USER
password = settings.POSTGRES_PASSWORD
dbname = settings.POSTGRES_DB
POSTGRES_PORT = settings.POSTGRES_PORT
POSTGRES_HOST = settings.POSTGRES_HOST
test_mode = settings.TESTMODE

SQLALCHEMY_DATABASE_URL = (
    f"postgresql+asyncpg://{username}:{password}@{POSTGRES_HOST}:{POSTGRES_PORT}/{dbname}"
)

if test_mode:
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)
else:
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False
)


# Dependency for getting a database session
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


class Base(declarative_base()):
    """Base class for all database models."""

    __abstract__ = True

    def model_dump(self, exclude_none=False):
        if exclude_none:
            return {
                field.name: getattr(self, field.name)
                for field in self.__table__.c
                if getattr(self, field.name) is not None
            }
        else:
            return {field.name: getattr(self, field.name) for field in self.__table__.c}


# Base = declarative_base()
# Base = BaseWithdict()
