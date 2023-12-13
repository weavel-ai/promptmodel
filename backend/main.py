import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        ws_ping_interval=30,  # Ping every 30 seconds
        ws_ping_timeout=20    # Timeout after 20 seconds if no pong response
    )
                