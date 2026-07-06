from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.core.storage import Storage
from app.schemas.boards import (
    BoardResponse,
    BoardListResponse,
    CreateBoardRequest,
    RefineBoardRequest,
    PlanBoardResponse,
    ScaffoldBoardResponse,
    ExportBoardResponse,
    DeployBoardResponse,
    TenantMetaResponse,
)
from app.schemas.tenants import (
    HandleCheckRequest,
    HandleCheckResponse,
    TenantCreateRequest,
    TenantResponse,
)
from app.services.intent_engine import IntentEngine
from app.services.orchestrator import Orchestrator
from app.services.tenants import TenantConflict, TenantService

router = APIRouter()
storage = Storage()
intent_engine = IntentEngine()
orchestrator = Orchestrator(storage)
tenant_service = TenantService(storage)


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/api/boards", response_model=BoardResponse)
def create_board(payload: CreateBoardRequest) -> BoardResponse:
    intent = intent_engine.analyze(payload.intent_text, payload.language)
    board = storage.create_board(
        name=payload.name or "Untitled Board",
        intent_text=payload.intent_text,
        detected_recipe=intent.detected_recipe,
        requirements=intent.requirements,
        architecture={},
        tasks=[],
        artifacts=[],
        status="draft",
    )
    return BoardResponse(**board)


@router.get("/api/boards/{board_id}", response_model=BoardResponse)
def get_board(board_id: int) -> BoardResponse:
    board = storage.get_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return BoardResponse(**board)


@router.get("/api/boards", response_model=BoardListResponse)
def list_boards() -> BoardListResponse:
    boards = storage.list_boards()
    return BoardListResponse(items=[BoardResponse(**b) for b in boards])


@router.post("/api/handles/check", response_model=HandleCheckResponse)
def check_handle(payload: HandleCheckRequest) -> HandleCheckResponse:
    result = tenant_service.check_handle(
        display_name=payload.display_name,
        preferred_handle=payload.preferred_handle,
        city=payload.city,
    )
    return HandleCheckResponse(**result)


@router.post("/api/tenants", response_model=TenantResponse)
def create_tenant(payload: TenantCreateRequest) -> TenantResponse:
    try:
        tenant = tenant_service.create_tenant(
            display_name=payload.display_name,
            handle=payload.handle,
            recipe=payload.recipe,
            board_id=payload.board_id,
        )
    except TenantConflict as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Handle already taken",
                "handle": exc.handle,
                "alternatives": exc.alternatives,
            },
        ) from exc
    return TenantResponse(**tenant)


@router.get("/api/tenants/{handle}", response_model=TenantResponse)
def get_tenant(handle: str) -> TenantResponse:
    tenant = storage.get_tenant_by_handle(handle)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantResponse(**tenant)


@router.post("/api/boards/{board_id}/refine", response_model=BoardResponse)
def refine_board(board_id: int, payload: RefineBoardRequest) -> BoardResponse:
    board = storage.get_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    updated_requirements = storage.merge_requirements(board, payload.answers)
    updated = storage.update_board(board_id, {"requirements": updated_requirements})
    return BoardResponse(**updated)


@router.post("/api/boards/{board_id}/plan", response_model=PlanBoardResponse)
def plan_board(board_id: int) -> PlanBoardResponse:
    board = orchestrator.plan_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return PlanBoardResponse(**board)


@router.post("/api/boards/{board_id}/scaffold", response_model=ScaffoldBoardResponse)
def scaffold_board(board_id: int) -> ScaffoldBoardResponse:
    board = orchestrator.scaffold_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return ScaffoldBoardResponse(**board)


@router.post("/api/boards/{board_id}/export", response_model=ExportBoardResponse)
def export_board(board_id: int) -> ExportBoardResponse:
    board = storage.get_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    export_plan = orchestrator.export_plan(board)
    return ExportBoardResponse(**export_plan)


@router.post("/api/boards/{board_id}/deploy", response_model=DeployBoardResponse)
def deploy_board(board_id: int) -> DeployBoardResponse:
    deployment = orchestrator.deploy_board(board_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Board not found")
    return DeployBoardResponse(**deployment)


@router.get("/api/tenants/{tenant_slug}/meta", response_model=TenantMetaResponse)
def get_tenant_meta(tenant_slug: str) -> TenantMetaResponse:
    deployment = storage.get_deployment_by_slug(tenant_slug)
    if not deployment:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantMetaResponse(
        board_id=deployment["board_id"],
        tenant_slug=deployment["tenant_slug"],
        public_url=deployment["public_url"],
        admin_url=deployment["admin_url"],
        qr_code_url=deployment["qr_code_path"],
        root_path=str(Path(deployment["qr_code_path"]).parent),
    )
