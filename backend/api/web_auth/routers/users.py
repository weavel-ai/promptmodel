import os
from dotenv import load_dotenv
from typing import Annotated, List
from sqlalchemy import ChunkedIteratorResult, select
from utils.security import create_hashed_identifier, hash_password
from fastapi import APIRouter, Depends, HTTPException, Response
from starlette import status as status_code
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from api.web_auth.models import UserCreate, UserRead
from db_models import User, Organization, UsersOrganizations
from base.database import get_session

router = APIRouter(prefix="/users")

load_dotenv()


@router.post("", status_code=status_code.HTTP_201_CREATED, response_model=UserRead)
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

        await session.flush()
        await session.refresh(new_user)

        org_list: List[Organization] = (
            await session.execute(select(Organization))
        ).all()

        if len(org_list) == 0:
            # create Organization
            org_name = os.environ.get("ORG_NAME", "admin")
            org_slug = os.environ.get("ORG_SLUG", "admin")
            org_id = "org_selfhosted"
            new_org = Organization(
                name=org_name,
                slug=org_slug,
                organization_id=org_id,
            )
            session.add(new_org)
            await session.flush()
            await session.refresh(new_org)

            # Create UsersOrganizations
            new_user_org = UsersOrganizations(
                user_id=new_user.user_id,
                organization_id=new_org.organization_id,
            )
            session.add(new_user_org)
            await session.flush()
            await session.refresh(new_user_org)

        await session.commit()

        return UserRead(**new_user.model_dump())
    except IntegrityError as exception:
        raise HTTPException(
            status_code=status_code.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        ) from exception
    except Exception as exception:
        raise HTTPException(
            status_code=status_code.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from exception


@router.post("/authorize", status_code=status_code.HTTP_200_OK, response_model=UserRead)
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
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                content="User with this email does not exist",
            )
        current_user: User = user_res[0][0]
        if not current_user.hashed_password:
            return Response(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                content="User with this email was signed up with a social provider",
            )
        if not current_user.verify_password(user.password):
            return Response(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                content="Password is incorrect",
            )
        return UserRead(**current_user.model_dump())
    except Exception as exception:
        print(exception)
        raise HTTPException(
            status_code=status_code.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from exception


@router.get(
    "/me",
    status_code=status_code.HTTP_200_OK,
    response_model=UserRead,
)
async def read_user_me(
    email: str,
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    """Return the current user."""
    user_res = (await session.execute(select(User).where(User.email == email))).all()
    if not user_res:
        return Response(
            status_code=status_code.HTTP_404_NOT_FOUND,
            content="User with this email does not exist",
        )
    current_user: User = user_res[0][0]

    return UserRead(**current_user.model_dump())
