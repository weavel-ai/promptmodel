from typing import Annotated, List
from sqlalchemy import ChunkedIteratorResult, select
from utils.security import create_hashed_identifier, get_user_id, hash_password
from fastapi import APIRouter, Depends, HTTPException, Response
from starlette import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from api.web_auth.models import UserCreate, UserRead
from db_models import User
from base.database import get_session
from fastapi_nextauth_jwt import NextAuthJWT

router = APIRouter(prefix="/users")


@router.post("/", status_code=http_status.HTTP_201_CREATED, response_model=UserRead)
async def create_user(
    user: UserCreate, session: AsyncSession = Depends(get_session)
) -> UserRead:
    """Create and return a new user."""
    try:
        user_id = create_hashed_identifier(prefix="user", value=user.email)
        new_user = User(
            user_id=user_id,
            hashed_password=hash_password(user.password),
            **user.model_dump(exclude={"password"})
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        return UserRead(**new_user.model_dump())
    except IntegrityError as exception:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        ) from exception
    except Exception as exception:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from exception


@router.post("/authorize", status_code=http_status.HTTP_200_OK, response_model=UserRead)
async def authorize_user(
    user: UserCreate, session: AsyncSession = Depends(get_session)
) -> UserRead:
    """Authorize and return a user."""
    try:
        user_res: List = (
            await session.execute(select(User).where(User.email == user.email))
        ).all()
        # Verify user
        if not user_res:
            return Response(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                content="User with this email does not exist",
            )
        current_user: User = user_res[0][0]
        if not current_user.hashed_password:
            return Response(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                content="User with this email was signed up with a social provider",
            )
        if not current_user.verify_password(user.password):
            return Response(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                content="Password is incorrect",
            )
        return UserRead(**current_user.model_dump())
    except Exception as exception:
        print(exception)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from exception


@router.get(
    "/me",
    status_code=http_status.HTTP_200_OK,
    response_model=UserRead,
)
async def read_user_me(
    email: str,
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    """Return the current user."""
    current_user = (
        await session.execute(select(User).where(User.email == email))
    ).scalar_one()

    return UserRead(**current_user.model_dump())
