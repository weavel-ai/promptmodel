"""Postgres SQL Database Session."""
from sqlmodel import SQLModel

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

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


async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)


async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False
)


# Dependency for getting a database session
async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
