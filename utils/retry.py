import time
import asyncio
from typing import Callable
from functools import wraps

def retry(max_retries: int = 3, delay: int = 1):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for i in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if i == max_retries - 1:  # if last attempt
                        raise e
                    else:
                        await time.sleep(delay)
        return wrapper
    return decorator

def aretry(max_retries: int = 3, delay: int = 1):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for i in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if i == max_retries - 1:  # if last attempt
                        raise e
                    else:
                        await asyncio.sleep(delay)
        return wrapper
    return decorator