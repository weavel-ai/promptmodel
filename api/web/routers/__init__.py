from fastapi import APIRouter

from .web import router as web_router
from .analytics import router as analytics_router
from .chat_log_session import router as chat_log_session_router
from .chat_log import router as chat_log_router
from .chat_model_version import router as chat_model_version_router
from .chat_model import router as chat_model_router
from .cli_access import router as cli_access_router
from .function_schema import router as function_schema_router
from .organization import router as organization_router
from .project_changelog import router as project_changelog_router
from .project import router as project_router
from .prompt_model_version import router as prompt_model_version_router
from .prompt_model import router as prompt_model_router
from .prompt import router as prompt_router
from .run_log import router as run_log_router
from .sample_input import router as sample_input_router
from .tags import router as tags_router
from .user import router as user_router

router = APIRouter()
router.include_router(web_router, tags=["web"])

router.include_router(
    organization_router, prefix="/organizations", tags=["organization"]
)
router.include_router(user_router, prefix="/users", tags=["user"])
router.include_router(cli_access_router, prefix="/cli_access", tags=["cli_access"])

router.include_router(project_router, prefix="/projects", tags=["project"])


router.include_router(chat_model_router, prefix="/chat_models", tags=["chat_model"])
router.include_router(
    chat_model_version_router,
    prefix="/chat_model_versions",
    tags=["chat_model_version"],
)
router.include_router(
    chat_log_session_router, prefix="/chat_log_sessions", tags=["chat_log_session"]
)
router.include_router(chat_log_router, prefix="/chat_logs", tags=["chat_log"])

router.include_router(
    prompt_model_router, prefix="/prompt_models", tags=["prompt_model"]
)
router.include_router(
    prompt_model_version_router,
    prefix="/prompt_model_versions",
    tags=["prompt_model_version"],
)
router.include_router(prompt_router, prefix="/prompts", tags=["prompt"])
router.include_router(run_log_router, prefix="/run_logs", tags=["run_log"])


router.include_router(
    project_changelog_router, prefix="/project_changelogs", tags=["project_changelog"]
)
router.include_router(
    function_schema_router, prefix="/function_schemas", tags=["function_schema"]
)
router.include_router(
    sample_input_router, prefix="/sample_inputs", tags=["sample_input"]
)
router.include_router(tags_router, prefix="/tags", tags=["tags"])

router.include_router(analytics_router, prefix="/metrics", tags=["metric"])
