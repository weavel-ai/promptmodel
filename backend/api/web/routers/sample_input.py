"""APIs for SampleInput"""

from datetime import datetime
from typing import Annotated, Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import JSONResponse, Response
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_401_UNAUTHORIZED,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import SampleInputInstance, CreateSampleInputBody, CreateDatasetBody

router = APIRouter()


# SampleInput Endpoints
@router.get("/project", response_model=List[SampleInputInstance])
async def fetch_project_sample_inputs(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    sample_inputs: List[Dict] = [
        SampleInputInstance(**sample_input.model_dump())
        for sample_input in (
            await session.execute(
                select(SampleInput)
                .where(SampleInput.project_uuid == project_uuid)
                .order_by(desc(SampleInput.created_at))
            )
        )
        .scalars()
        .all()
    ]
    return sample_inputs



@router.get("/function_model", response_model=List[SampleInputInstance])
async def fetch_function_model_sample_inputs(
    jwt: Annotated[str, Depends(get_jwt)],
    function_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    sample_inputs: List[Dict] = [
        SampleInputInstance(**sample_input.model_dump())
        for sample_input in (
            await session.execute(
                select(SampleInput)
                .where(SampleInput.function_model_uuid == function_model_uuid)
                .order_by(desc(SampleInput.created_at))
            )
        )
        .scalars()
        .all()
    ]
    return sample_inputs
    


@router.post("", response_model=SampleInputInstance)
async def create_sample_input(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateSampleInputBody,
    session: AsyncSession = Depends(get_session),
):
    if body.name:
        # check if same name in project
        sample_input_in_db = (
            await session.execute(
                select(SampleInput)
                .where(SampleInput.name == body.name)
                .where(SampleInput.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()

        if sample_input_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
    new_sample_input = SampleInput(**body.model_dump())
    session.add(new_sample_input)
    await session.commit()
    await session.refresh(new_sample_input)

    return SampleInputInstance(**new_sample_input.model_dump())



@router.post("/dataset")
async def create_dataset(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateDatasetBody,
    session: AsyncSession = Depends(get_session),
):
    # create dataset
    new_dataset = Dataset(
        name=body.name,
        description=body.description,
        project_uuid=body.project_uuid,
        function_model_uuid=body.function_model_uuid,
    )
    session.add(new_dataset)
    await session.commit()

    return JSONResponse(content=new_dataset.model_dump(), status_code=200)




@router.post("/dataset/{dataset_uuid}")
async def save_sample_inputs_in_dataset(
    jwt: Annotated[str, Depends(get_jwt)],
    dataset_uuid: str,
    body: List[CreateSampleInputBody],
    session: AsyncSession = Depends(get_session),
):
    # find dataset
    dataset: Dataset = (
        await session.execute(select(Dataset).where(Dataset.uuid == dataset_uuid))
    ).scalar_one_or_none()

    # check if dataset exists
    if dataset is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )

    # check if user have access to dataset
    org_id = jwt["organization_id"]
    project_check = (
        await session.execute(
            select(Project)
            .where(Project.uuid == dataset.project_uuid)
            .where(Project.organization_id == org_id)
        )
    ).scalar_one_or_none()

    if project_check is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="User Cannot Access Dataset",
        )

    # create sample inputs
    sample_input_list = [
        SampleInput(**sample_input.model_dump()) for sample_input in body
    ]
    session.add_all(sample_input_list)
    await session.commit()

    return Response(status_code=200)




@router.delete("/{sample_input_uuid}")
async def delete_sample_input(
    jwt: Annotated[str, Depends(get_jwt)],
    sample_input_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    sample_input: SampleInput = (
        await session.execute(
            select(SampleInput).where(SampleInput.uuid == sample_input_uuid)
        )
    ).scalar_one_or_none()

    if sample_input is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="SampleInput not found",
        )

    # check if user have access to project
    org_id = jwt["organization_id"]
    project_check = (
        await session.execute(
            select(Project)
            .where(Project.uuid == sample_input.project_uuid)
            .where(Project.organization_id == org_id)
        )
    ).scalar_one_or_none()

    if project_check is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="User Cannot Access SampleInput",
        )

    (
        await session.execute(
            delete(SampleInput).where(SampleInput.uuid == sample_input_uuid)
        )
    )

    return Response(status_code=200)

    
