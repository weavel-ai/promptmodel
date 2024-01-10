from fastapi import APIRouter

from .web import router as web_router
from .analytics import router as analytics_router
from .chat_session import router as chat_session_router
from .chat_message import router as chat_message_router
from .chat_model_version import router as chat_model_version_router
from .chat_model import router as chat_model_router
from .cli_access import router as cli_access_router
from .function_schema import router as function_schema_router
from .organization import router as organization_router
from .project_changelog import router as project_changelog_router
from .project import router as project_router
from .function_model_version import router as function_model_version_router
from .function_model import router as function_model_router
from .prompt import router as prompt_router
from .run_log import router as run_log_router
from .sample_input import router as sample_input_router
from .tags import router as tags_router
from .user import router as user_router
from .subscribe import router as subscribe_router
from .unit_logger import router as unit_logger_router

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
    chat_session_router, prefix="/chat_sessions", tags=["chat_session"]
)
router.include_router(
    chat_message_router, prefix="/chat_messages", tags=["chat_message"]
)

router.include_router(
    function_model_router, prefix="/function_models", tags=["function_model"]
)
router.include_router(
    function_model_version_router,
    prefix="/function_model_versions",
    tags=["function_model_version"],
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

router.include_router(subscribe_router, prefix="/subscribe", tags=["subscribe"])

router.include_router(unit_logger_router, prefix="/unit_loggers", tags=["unit_logger"])