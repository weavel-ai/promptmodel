"""Weavelapps FastAPI application entry point.""" ""
import pytz

from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from api import cli, web, dev

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cli.router, prefix="/api/cli", tags=["cli"])
app.include_router(web.router, prefix="/api/web", tags=["web"])
app.include_router(dev.router, prefix="/api/dev", tags=["dev"])

load_dotenv()


# scheduler = BackgroundScheduler()
# tz = pytz.timezone("Asia/Seoul")  # 예를 들어, 한국 시간대를 지정
# trigger = CronTrigger(hour=7, minute=45, timezone=tz)  # 매일 아침 7시에 실행

# # scheduler.add_job(execute_coroutine_mailing_type_1, trigger=trigger)
# scheduler.add_job(send_newsletter_job, trigger=trigger)
# scheduler.start()


@app.get("/health")
def health():
    """Health check endpoint."""
    return Response(status_code=200)
