"""Weavelapps FastAPI application entry point.""" ""
import os
import pytz

from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api import cli, web, dev, web_auth

load_dotenv()

app = FastAPI()


frontend_url = os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:3000")
origins = [frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.middleware("http")
# async def log_requests(request, call_next):
#     # 요청 본문을 읽기
#     body = await request.body()
#     print(f"Request: {request.method} {request.url} Body: {body.decode()}")

#     # 원래의 요청 복원
#     async def override_receive():
#         return {"type": "http.request", "body": body}

#     request._receive = override_receive

#     # 요청 처리 및 응답 로깅
#     response = await call_next(request)
#     print(f"Response: {response.status_code}")
#     return response

# temporary
app.include_router(web_auth.router, prefix="/api/web/v1", tags=["web/v1"])

app.include_router(cli.router, prefix="/api/cli", tags=["cli"])
app.include_router(web.router, prefix="/api/web")
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
