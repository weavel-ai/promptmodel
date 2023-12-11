from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    DB_NAME: str = os.environ.get("DB_NAME")
    DB_PASSWORD: str = os.environ.get("DB_PASSWORD")
    DB_USERNAME: str = os.environ.get("DB_USERNAME")
    DB_HOST: str = os.environ.get("DB_HOST")
    DB_PORT: str = os.environ.get("DB_PORT")
    TESTMODE: bool = os.environ.get("TESTMODE", False)


# from pydantic import BaseSettings


# class Settings(BaseSettings):
#     DB_NAME: str
#     DB_PASSWORD: str
#     DB_USERNAME: str
#     DB_HOST: str
#     DB_PORT: str

#     class Config:
#         env_file = ".env"
