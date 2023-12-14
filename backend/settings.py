from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    POSTGRES_NAME: str = os.environ.get("POSTGRES_NAME")
    POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD")
    POSTGRES_USER: str = os.environ.get("POSTGRES_USER")
    POSTGRES_HOST: str = os.environ.get("POSTGRES_HOST")
    POSTGRES_PORT: str = os.environ.get("POSTGRES_PORT", 5432)
    TESTMODE: bool = os.environ.get("TESTMODE", False)


# from pydantic import BaseSettings


# class Settings(BaseSettings):
#     POSTGRES_NAME: str
#     POSTGRES_PASSWORD: str
#     POSTGRES_USER: str
#     POSTGRES_HOST: str
#     POSTGRES_PORT: str

#     class Config:
#         env_file = ".env"
