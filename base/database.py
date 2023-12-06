"""Postgres SQL Database Session."""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from settings import Settings

settings = Settings()

username = settings.DB_USERNAME
password = settings.DB_PASSWORD
dbname = settings.DB_NAME
db_port = settings.DB_PORT
db_host = settings.DB_HOST

SQLALCHEMY_DATABASE_URL = (
    f"postgresql+asyncpg://{username}:{password}@{db_host}:{db_port}/{dbname}"
)
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False
)


# Dependency for getting a database session
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


Base = declarative_base()
