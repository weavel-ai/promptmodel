"""Weavelapps FastAPI application entry point.""" ""
import os
import pytz

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api import cli, web, dev, web_auth

load_dotenv()

app = FastAPI()


frontend_url = os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:3000")
origins = [frontend_url]

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    print(exc, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    try:
        print(exc.detail)
    except AttributeError:
        print(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.middleware("http")
# async def log_requests(request, call_next):
#     # extract request body
#     body = await request.body()
#     print(f"Request: {request.method} {request.url} Body: {body.decode()}")

#     # recover request body
#     async def override_receive():
#         return {"type": "http.request", "body": body}

#     request._receive = override_receive

#     # process request and log response
#     response = await call_next(request)
#     print(f"Response: {response.status_code}")
#     return response

# temporary
app.include_router(web_auth.router, prefix="/api/web/v1", tags=["web/v1"])

app.include_router(cli.router, prefix="/api/cli", tags=["cli"])
app.include_router(web.router, prefix="/api/web")
app.include_router(dev.router, prefix="/api/dev", tags=["dev"])

load_dotenv()


@app.get("/health")
def health():
    """Health check endpoint."""
    return Response(status_code=200)
