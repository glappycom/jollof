import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import qrcode

from app.core.storage import Storage
from app.services.recipes import get_recipe_definition


class Orchestrator:
    def __init__(self, storage: Storage) -> None:
        self.storage = storage

    def plan_board(self, board_id: int) -> Optional[Dict[str, Any]]:
        board = self.storage.get_board(board_id)
        if not board:
            return None
        recipe = get_recipe_definition(board["detected_recipe"])
        updates = {
            "tasks": recipe["tasks"],
            "architecture": recipe["architecture"],
            "status": "planned",
        }
        return self.storage.update_board(board_id, updates)

    def scaffold_board(self, board_id: int) -> Optional[Dict[str, Any]]:
        board = self.storage.get_board(board_id)
        if not board:
            return None
        scaffold = self._create_scaffold(board)
        artifacts = list(board.get("artifacts", []))
        artifacts.append(scaffold["artifact"])
        updates = {"artifacts": artifacts, "status": "scaffolding"}
        return self.storage.update_board(board_id, updates)

    def export_plan(self, board: Dict[str, Any]) -> Dict[str, Any]:
        recipe = get_recipe_definition(board["detected_recipe"])
        return {
            "board_id": board["id"],
            "planned_files": recipe["scaffold_files"],
            "message": "Zip export not implemented yet",
        }

    def deploy_board(self, board_id: int) -> Optional[Dict[str, Any]]:
        board = self.storage.get_board(board_id)
        if not board:
            return None
        deployment = self.storage.get_deployment_by_board(board_id)
        if deployment:
            return deployment

        repo_root = Path(__file__).resolve().parents[3]
        tenants_root = repo_root / "tenants"
        tenants_root.mkdir(parents=True, exist_ok=True)

        scaffold_root = repo_root / "workspace" / f"board_{board_id}"
        if not scaffold_root.exists():
            self._create_scaffold(board)

        tenant_slug = self._generate_tenant_slug(board)
        tenant_root = tenants_root / tenant_slug
        if tenant_root.exists():
            raise ValueError("Tenant already deployed")
        shutil.copytree(scaffold_root, tenant_root)

        public_url = f"https://{tenant_slug}.jollof.local"
        admin_url = f"{public_url}/admin"
        qr_code_path = tenant_root / "qr.png"
        qr = qrcode.QRCode(border=2, box_size=8)
        qr.add_data(public_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(qr_code_path)

        deployment = self.storage.create_deployment(
            board_id=board_id,
            tenant_slug=tenant_slug,
            public_url=public_url,
            admin_url=admin_url,
            qr_code_path=str(qr_code_path),
        )
        self.storage.update_board(board_id, {"status": "deployed"})
        return {
            "board_id": deployment["board_id"],
            "tenant_slug": deployment["tenant_slug"],
            "public_url": deployment["public_url"],
            "admin_url": deployment["admin_url"],
            "qr_code_url": deployment["qr_code_path"],
            "root_path": str(tenant_root),
        }

    def _create_scaffold(self, board: Dict[str, Any]) -> Dict[str, Any]:
        repo_root = Path(__file__).resolve().parents[3]
        workspace_root = repo_root / "workspace"
        board_root = workspace_root / f"board_{board['id']}"
        backend_root = board_root / "backend"
        mobile_root = board_root / "mobile"

        workspace_root.mkdir(parents=True, exist_ok=True)
        backend_root.mkdir(parents=True, exist_ok=True)
        mobile_root.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc).isoformat()
        files = self._scaffold_files(board, now)
        created_files: List[str] = []
        for relative_path, contents in files.items():
            file_path = board_root / relative_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(contents, encoding="ascii")
            created_files.append(relative_path.replace("\\", "/"))

        created_files.sort()
        file_tree = self._build_tree(created_files)

        artifact = {
            "type": "scaffold_plan_v1",
            "root_path": str(board_root),
            "created_files": created_files,
            "file_tree": file_tree,
            "commands_to_run": self._commands_to_run(board["detected_recipe"]),
        }

        return {"artifact": artifact}

    def _scaffold_files(self, board: Dict[str, Any], now: str) -> Dict[str, str]:
        recipe = board["detected_recipe"]
        jollof_payload = {
            "board_id": board["id"],
            "recipe": recipe,
            "recipe_meta": self._recipe_metadata(recipe),
            "generated_at": now,
        }
        files = {
            "README.md": self._root_readme(recipe),
            "jollof.json": json.dumps(jollof_payload, indent=2),
        }
        if recipe == "bookings":
            files.update(self._scaffold_files_bookings())
        else:
            files.update(self._scaffold_files_base())
        return files

    def _generate_tenant_slug(self, board: Dict[str, Any]) -> str:
        base = board.get("name") or f"board-{board['id']}"
        slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
        if not slug:
            slug = f"board-{board['id']}"
        return f"{slug}-{board['id']}"

    def _scaffold_files_base(self) -> Dict[str, str]:
        return {
            "backend/app/__init__.py": "",
            "backend/app/main.py": self._backend_main(),
            "backend/requirements.txt": self._backend_requirements(),
            "backend/README.md": self._backend_readme(),
            "backend/.env.example": self._backend_env(),
            "mobile/pubspec.yaml": self._mobile_pubspec(),
            "mobile/lib/main.dart": self._mobile_main(),
            "mobile/README.md": self._mobile_readme(),
            "mobile/.gitignore": self._mobile_gitignore(),
        }

    def _scaffold_files_bookings(self) -> Dict[str, str]:
        return {
            "backend/app/__init__.py": "",
            "backend/app/main.py": self._backend_main_bookings(),
            "backend/app/db.py": self._backend_db_bookings(),
            "backend/app/models.py": self._backend_models_bookings(),
            "backend/app/schemas.py": self._backend_schemas_bookings(),
            "backend/app/routes.py": self._backend_routes_bookings(),
            "backend/requirements.txt": self._backend_requirements_bookings(),
            "backend/README.md": self._backend_readme_bookings(),
            "backend/.env.example": self._backend_env_bookings(),
            "backend/init_db.py": self._backend_init_script(),
            "mobile/pubspec.yaml": self._mobile_pubspec(),
            "mobile/lib/main.dart": self._mobile_main_bookings(),
            "mobile/lib/api_client.dart": self._mobile_api_client(),
            "mobile/lib/screens/home_screen.dart": self._mobile_home_screen(),
            "mobile/lib/screens/book_appointment_screen.dart": self._mobile_book_screen(),
            "mobile/lib/screens/my_appointments_screen.dart": self._mobile_my_appointments_screen(),
            "mobile/README.md": self._mobile_readme(),
            "mobile/.gitignore": self._mobile_gitignore(),
        }

    def _build_tree(self, files: List[str]) -> Dict[str, Any]:
        tree: Dict[str, Any] = {"name": ".", "type": "dir", "children": {}}
        for file_path in files:
            parts = file_path.split("/")
            cursor = tree["children"]
            for part in parts[:-1]:
                cursor = cursor.setdefault(part, {"name": part, "type": "dir", "children": {}})["children"]
            cursor[parts[-1]] = {"name": parts[-1], "type": "file"}
        return self._flatten_tree(tree)

    def _flatten_tree(self, node: Dict[str, Any]) -> Dict[str, Any]:
        if node["type"] == "file":
            return {"name": node["name"], "type": "file"}
        children = [self._flatten_tree(child) for child in node["children"].values()]
        children.sort(key=lambda item: (item["type"] != "dir", item["name"]))
        return {"name": node["name"], "type": "dir", "children": children}

    def _root_readme(self, recipe: str) -> str:
        backend_block = (
            "cd backend\n"
            "python -m venv .venv\n"
            ".venv\\Scripts\\activate\n"
            "pip install -r requirements.txt\n"
        )
        if recipe == "bookings":
            backend_block += "python init_db.py\n"
        backend_block += "uvicorn app.main:app --reload\n"
        return (
            "# Jollof Workspace\n\n"
            "This workspace contains both backend and mobile starters.\n\n"
            "## Backend (FastAPI)\n\n"
            "```bash\n"
            f"{backend_block}"
            "```\n\n"
            "## Mobile (Flutter)\n\n"
            "```bash\n"
            "cd mobile\n"
            "flutter pub get\n"
            "flutter run\n"
            "```\n"
        )

    def _backend_main(self) -> str:
        return (
            "from fastapi import FastAPI\n\n"
            "app = FastAPI(title=\"Jollof Workspace Backend\")\n\n\n"
            "@app.get(\"/\")\n"
            "def root() -> dict:\n"
            "    return {\"message\": \"Hello from Jollof backend\"}\n\n\n"
            "@app.get(\"/health\")\n"
            "def health() -> dict:\n"
            "    return {\"status\": \"ok\"}\n"
        )

    def _backend_requirements(self) -> str:
        return "fastapi\nuvicorn\n"

    def _backend_readme(self) -> str:
        return (
            "# Backend (FastAPI)\n\n"
            "```bash\n"
            "python -m venv .venv\n"
            ".venv\\Scripts\\activate\n"
            "pip install -r requirements.txt\n"
            "uvicorn app.main:app --reload\n"
            "```\n"
        )

    def _backend_env(self) -> str:
        return "APP_ENV=dev\n"

    def _backend_main_bookings(self) -> str:
        return (
            "from contextlib import asynccontextmanager\n"
            "from fastapi import Depends, FastAPI\n"
            "from fastapi.openapi.docs import get_swagger_ui_html\n"
            "from fastapi.openapi.utils import get_openapi\n"
            "from sqlalchemy.orm import Session\n\n"
            "from app.db import SessionLocal, init_db\n"
            "from app.routes import resolve_tenant, router\n\n\n"
            "@asynccontextmanager\n"
            "async def lifespan(_: FastAPI):\n"
            "    init_db()\n"
            "    yield\n\n\n"
            "app = FastAPI(title=\"Jollof Bookings Backend\", lifespan=lifespan)\n"
            "app.include_router(router)\n\n\n"
            "def get_db():\n"
            "    db = SessionLocal()\n"
            "    try:\n"
            "        yield db\n"
            "    finally:\n"
            "        db.close()\n\n\n"
            "@app.get(\"/health\")\n"
            "def health() -> dict:\n"
            "    return {\"status\": \"ok\"}\n\n\n"
            "@app.get(\"/b/{handle}/openapi.json\", include_in_schema=False)\n"
            "def tenant_openapi(handle: str, db: Session = Depends(get_db)):\n"
            "    resolve_tenant(handle, db)\n"
            "    return get_openapi(title=app.title, version=\"0.1.0\", routes=app.routes)\n\n\n"
            "@app.get(\"/b/{handle}/docs\", include_in_schema=False)\n"
            "def tenant_docs(handle: str, db: Session = Depends(get_db)):\n"
            "    resolve_tenant(handle, db)\n"
            "    return get_swagger_ui_html(openapi_url=f\"/b/{handle}/openapi.json\", title=\"Jollof Bookings Docs\")\n"
        )

    def _backend_db_bookings(self) -> str:
        return (
            "import os\n"
            "from pathlib import Path\n\n"
            "from sqlalchemy import create_engine\n"
            "from sqlalchemy.orm import declarative_base, sessionmaker\n\n"
            "BASE_DIR = Path(__file__).resolve().parent\n"
            "DB_PATH = os.getenv(\"JOLOFF_DB_PATH\", str(BASE_DIR / \"data\" / \"app.db\"))\n"
            "Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)\n"
            "DATABASE_URL = f\"sqlite:///{DB_PATH}\"\n\n"
            "engine = create_engine(DATABASE_URL, connect_args={\"check_same_thread\": False})\n"
            "SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)\n"
            "Base = declarative_base()\n\n\n"
            "def init_db() -> None:\n"
            "    from app import models\n"
            "    Base.metadata.create_all(bind=engine)\n"
            "    ensure_demo_tenant()\n\n\n"
            "def ensure_demo_tenant() -> None:\n"
            "    from datetime import datetime, timezone\n"
            "    from app import models\n"
            "    db = SessionLocal()\n"
            "    try:\n"
            "        tenant = db.query(models.Tenant).filter(models.Tenant.handle == \"demo-salon\").first()\n"
            "        if not tenant:\n"
            "            now = datetime.now(timezone.utc)\n"
            "            tenant = models.Tenant(\n"
            "                display_name=\"Demo Salon\",\n"
            "                handle=\"demo-salon\",\n"
            "                recipe=\"salon\",\n"
            "                created_at=now,\n"
            "                updated_at=now,\n"
            "            )\n"
            "            db.add(tenant)\n"
            "            db.commit()\n"
            "    finally:\n"
            "        db.close()\n"
        )

    def _backend_models_bookings(self) -> str:
        return (
            "from datetime import datetime, timezone\n"
            "from sqlalchemy import Column, DateTime, ForeignKey, Integer, String\n"
            "from sqlalchemy.orm import relationship\n\n"
            "from app.db import Base\n\n\n"
            "class Tenant(Base):\n"
            "    __tablename__ = \"tenants\"\n"
            "    id = Column(Integer, primary_key=True, index=True)\n"
            "    display_name = Column(String, nullable=False)\n"
            "    handle = Column(String, nullable=False, unique=True, index=True)\n"
            "    recipe = Column(String, nullable=False, default=\"salon\")\n"
            "    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))\n"
            "    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))\n\n\n"
            "class Customer(Base):\n"
            "    __tablename__ = \"customers\"\n"
            "    id = Column(Integer, primary_key=True, index=True)\n"
            "    tenant_id = Column(Integer, ForeignKey(\"tenants.id\"), nullable=False, index=True)\n"
            "    name = Column(String, nullable=False)\n"
            "    phone = Column(String, nullable=True)\n"
            "    email = Column(String, nullable=True)\n"
            "    tenant = relationship(\"Tenant\")\n\n\n"
            "class Service(Base):\n"
            "    __tablename__ = \"services\"\n"
            "    id = Column(Integer, primary_key=True, index=True)\n"
            "    tenant_id = Column(Integer, ForeignKey(\"tenants.id\"), nullable=False, index=True)\n"
            "    name = Column(String, nullable=False)\n"
            "    duration_minutes = Column(Integer, nullable=False, default=30)\n"
            "    tenant = relationship(\"Tenant\")\n\n\n"
            "class Staff(Base):\n"
            "    __tablename__ = \"staff\"\n"
            "    id = Column(Integer, primary_key=True, index=True)\n"
            "    tenant_id = Column(Integer, ForeignKey(\"tenants.id\"), nullable=False, index=True)\n"
            "    name = Column(String, nullable=False)\n"
            "    role = Column(String, nullable=True)\n"
            "    tenant = relationship(\"Tenant\")\n\n\n"
            "class Appointment(Base):\n"
            "    __tablename__ = \"appointments\"\n"
            "    id = Column(Integer, primary_key=True, index=True)\n"
            "    tenant_id = Column(Integer, ForeignKey(\"tenants.id\"), nullable=False, index=True)\n"
            "    customer_name = Column(String, nullable=False)\n"
            "    start_time = Column(String, nullable=False)\n"
            "    end_time = Column(String, nullable=False)\n"
            "    service_id = Column(Integer, ForeignKey(\"services.id\"), nullable=True)\n"
            "    staff_id = Column(Integer, ForeignKey(\"staff.id\"), nullable=True)\n"
            "    customer_id = Column(Integer, ForeignKey(\"customers.id\"), nullable=True)\n"
            "    tenant = relationship(\"Tenant\")\n"
            "    service = relationship(\"Service\")\n"
            "    staff = relationship(\"Staff\")\n"
            "    customer = relationship(\"Customer\")\n"
        )

    def _backend_schemas_bookings(self) -> str:
        return (
            "from datetime import datetime, timezone\n"
            "from typing import Optional\n"
            "from pydantic import BaseModel, ConfigDict\n\n\n"
            "class TenantCreate(BaseModel):\n"
            "    display_name: str\n"
            "    handle: str\n"
            "    recipe: str = \"salon\"\n\n\n"
            "class TenantOut(BaseModel):\n"
            "    id: int\n"
            "    display_name: str\n"
            "    handle: str\n"
            "    recipe: str\n"
            "    created_at: datetime\n"
            "    updated_at: datetime\n"
            "    model_config = ConfigDict(from_attributes=True)\n\n\n"
            "class CustomerCreate(BaseModel):\n"
            "    name: str\n"
            "    phone: Optional[str] = None\n"
            "    email: Optional[str] = None\n\n\n"
            "class CustomerUpdate(BaseModel):\n"
            "    name: Optional[str] = None\n"
            "    phone: Optional[str] = None\n"
            "    email: Optional[str] = None\n\n\n"
            "class CustomerOut(CustomerCreate):\n"
            "    id: int\n"
            "    model_config = ConfigDict(from_attributes=True)\n\n\n"
            "class ServiceCreate(BaseModel):\n"
            "    name: str\n"
            "    duration_minutes: int = 30\n\n\n"
            "class ServiceUpdate(BaseModel):\n"
            "    name: Optional[str] = None\n"
            "    duration_minutes: Optional[int] = None\n\n\n"
            "class ServiceOut(ServiceCreate):\n"
            "    id: int\n"
            "    model_config = ConfigDict(from_attributes=True)\n\n\n"
            "class StaffCreate(BaseModel):\n"
            "    name: str\n"
            "    role: Optional[str] = None\n\n\n"
            "class StaffUpdate(BaseModel):\n"
            "    name: Optional[str] = None\n"
            "    role: Optional[str] = None\n\n\n"
            "class StaffOut(StaffCreate):\n"
            "    id: int\n"
            "    model_config = ConfigDict(from_attributes=True)\n\n\n"
            "class AppointmentCreate(BaseModel):\n"
            "    customer_name: str\n"
            "    start_time: str\n"
            "    end_time: str\n"
            "    service_id: Optional[int] = None\n"
            "    staff_id: Optional[int] = None\n"
            "    customer_id: Optional[int] = None\n\n\n"
            "class AppointmentUpdate(BaseModel):\n"
            "    customer_name: Optional[str] = None\n"
            "    start_time: Optional[str] = None\n"
            "    end_time: Optional[str] = None\n"
            "    service_id: Optional[int] = None\n"
            "    staff_id: Optional[int] = None\n"
            "    customer_id: Optional[int] = None\n\n\n"
            "class AppointmentOut(AppointmentCreate):\n"
            "    id: int\n"
            "    model_config = ConfigDict(from_attributes=True)\n"
        )

    def _backend_routes_bookings(self) -> str:
        return (
            "from datetime import datetime, timezone\n"
            "from typing import List\n"
            "from fastapi import APIRouter, Depends, HTTPException\n"
            "from sqlalchemy.orm import Session\n\n"
            "from app.db import SessionLocal\n"
            "from app import models, schemas\n\n"
            "router = APIRouter()\n"
            "tenant_router = APIRouter(prefix=\"/b/{handle}\")\n\n\n"
            "def get_db():\n"
            "    db = SessionLocal()\n"
            "    try:\n"
            "        yield db\n"
            "    finally:\n"
            "        db.close()\n\n\n"
            "def resolve_tenant(handle: str, db: Session = Depends(get_db)) -> models.Tenant:\n"
            "    tenant = db.query(models.Tenant).filter(models.Tenant.handle == handle).first()\n"
            "    if not tenant:\n"
            "        raise HTTPException(status_code=404, detail=\"Business not found\")\n"
            "    return tenant\n\n\n"
            "@router.post(\"/api/tenants\", response_model=schemas.TenantOut)\n"
            "def create_tenant(payload: schemas.TenantCreate, db: Session = Depends(get_db)):\n"
            "    existing = db.query(models.Tenant).filter(models.Tenant.handle == payload.handle).first()\n"
            "    if existing:\n"
            "        raise HTTPException(status_code=409, detail=\"Handle already exists\")\n"
            "    now = datetime.now(timezone.utc)\n"
            "    tenant = models.Tenant(\n"
            "        display_name=payload.display_name,\n"
            "        handle=payload.handle,\n"
            "        recipe=payload.recipe,\n"
            "        created_at=now,\n"
            "        updated_at=now,\n"
            "    )\n"
            "    db.add(tenant)\n"
            "    db.commit()\n"
            "    db.refresh(tenant)\n"
            "    return tenant\n\n\n"
            "@router.get(\"/api/tenants/{handle}\", response_model=schemas.TenantOut)\n"
            "def get_tenant(handle: str, db: Session = Depends(get_db)):\n"
            "    tenant = db.query(models.Tenant).filter(models.Tenant.handle == handle).first()\n"
            "    if not tenant:\n"
            "        raise HTTPException(status_code=404, detail=\"Tenant not found\")\n"
            "    return tenant\n\n\n"
            "@tenant_router.get(\"/admin/meta\", response_model=schemas.TenantOut)\n"
            "def admin_meta(\n"
            "    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    return tenant\n\n\n"
            "@tenant_router.get(\"/customers\", response_model=List[schemas.CustomerOut])\n"
            "def list_customers(\n"
            "    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    return db.query(models.Customer).filter(models.Customer.tenant_id == tenant.id).all()\n\n\n"
            "@tenant_router.post(\"/customers\", response_model=schemas.CustomerOut)\n"
            "def create_customer(\n"
            "    handle: str,\n"
            "    payload: schemas.CustomerCreate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    customer = models.Customer(tenant_id=tenant.id, **payload.model_dump())\n"
            "    db.add(customer)\n"
            "    db.commit()\n"
            "    db.refresh(customer)\n"
            "    return customer\n\n\n"
            "@tenant_router.get(\"/customers/{customer_id}\", response_model=schemas.CustomerOut)\n"
            "def get_customer(\n"
            "    handle: str, customer_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    customer = (\n"
            "        db.query(models.Customer)\n"
            "        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not customer:\n"
            "        raise HTTPException(status_code=404, detail=\"Customer not found\")\n"
            "    return customer\n\n\n"
            "@tenant_router.put(\"/customers/{customer_id}\", response_model=schemas.CustomerOut)\n"
            "def update_customer(\n"
            "    handle: str,\n"
            "    customer_id: int,\n"
            "    payload: schemas.CustomerUpdate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    customer = (\n"
            "        db.query(models.Customer)\n"
            "        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not customer:\n"
            "        raise HTTPException(status_code=404, detail=\"Customer not found\")\n"
            "    for key, value in payload.model_dump(exclude_unset=True).items():\n"
            "        setattr(customer, key, value)\n"
            "    db.commit()\n"
            "    db.refresh(customer)\n"
            "    return customer\n\n\n"
            "@tenant_router.delete(\"/customers/{customer_id}\")\n"
            "def delete_customer(\n"
            "    handle: str, customer_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    customer = (\n"
            "        db.query(models.Customer)\n"
            "        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not customer:\n"
            "        raise HTTPException(status_code=404, detail=\"Customer not found\")\n"
            "    db.delete(customer)\n"
            "    db.commit()\n"
            "    return {\"deleted\": True}\n\n\n"
            "@tenant_router.get(\"/appointments\", response_model=List[schemas.AppointmentOut])\n"
            "def list_appointments(\n"
            "    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    return db.query(models.Appointment).filter(models.Appointment.tenant_id == tenant.id).all()\n\n\n"
            "@tenant_router.post(\"/appointments\", response_model=schemas.AppointmentOut)\n"
            "def create_appointment(\n"
            "    handle: str,\n"
            "    payload: schemas.AppointmentCreate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    if payload.service_id:\n"
            "        service = (\n"
            "            db.query(models.Service)\n"
            "            .filter(models.Service.id == payload.service_id, models.Service.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not service:\n"
            "            raise HTTPException(status_code=404, detail=\"Service not found\")\n"
            "    if payload.staff_id:\n"
            "        staff = (\n"
            "            db.query(models.Staff)\n"
            "            .filter(models.Staff.id == payload.staff_id, models.Staff.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not staff:\n"
            "            raise HTTPException(status_code=404, detail=\"Staff not found\")\n"
            "    if payload.customer_id:\n"
            "        customer = (\n"
            "            db.query(models.Customer)\n"
            "            .filter(models.Customer.id == payload.customer_id, models.Customer.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not customer:\n"
            "            raise HTTPException(status_code=404, detail=\"Customer not found\")\n"
            "    appointment = models.Appointment(tenant_id=tenant.id, **payload.model_dump())\n"
            "    db.add(appointment)\n"
            "    db.commit()\n"
            "    db.refresh(appointment)\n"
            "    return appointment\n\n\n"
            "@tenant_router.get(\"/appointments/{appointment_id}\", response_model=schemas.AppointmentOut)\n"
            "def get_appointment(\n"
            "    handle: str, appointment_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    appointment = (\n"
            "        db.query(models.Appointment)\n"
            "        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not appointment:\n"
            "        raise HTTPException(status_code=404, detail=\"Appointment not found\")\n"
            "    return appointment\n\n\n"
            "@tenant_router.put(\"/appointments/{appointment_id}\", response_model=schemas.AppointmentOut)\n"
            "def update_appointment(\n"
            "    handle: str,\n"
            "    appointment_id: int,\n"
            "    payload: schemas.AppointmentUpdate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    appointment = (\n"
            "        db.query(models.Appointment)\n"
            "        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not appointment:\n"
            "        raise HTTPException(status_code=404, detail=\"Appointment not found\")\n"
            "    updates = payload.model_dump(exclude_unset=True)\n"
            "    if \"service_id\" in updates and updates[\"service_id\"] is not None:\n"
            "        service = (\n"
            "            db.query(models.Service)\n"
            "            .filter(models.Service.id == updates[\"service_id\"], models.Service.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not service:\n"
            "            raise HTTPException(status_code=404, detail=\"Service not found\")\n"
            "    if \"staff_id\" in updates and updates[\"staff_id\"] is not None:\n"
            "        staff = (\n"
            "            db.query(models.Staff)\n"
            "            .filter(models.Staff.id == updates[\"staff_id\"], models.Staff.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not staff:\n"
            "            raise HTTPException(status_code=404, detail=\"Staff not found\")\n"
            "    if \"customer_id\" in updates and updates[\"customer_id\"] is not None:\n"
            "        customer = (\n"
            "            db.query(models.Customer)\n"
            "            .filter(models.Customer.id == updates[\"customer_id\"], models.Customer.tenant_id == tenant.id)\n"
            "            .first()\n"
            "        )\n"
            "        if not customer:\n"
            "            raise HTTPException(status_code=404, detail=\"Customer not found\")\n"
            "    for key, value in updates.items():\n"
            "        setattr(appointment, key, value)\n"
            "    db.commit()\n"
            "    db.refresh(appointment)\n"
            "    return appointment\n\n\n"
            "@tenant_router.delete(\"/appointments/{appointment_id}\")\n"
            "def delete_appointment(\n"
            "    handle: str, appointment_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    appointment = (\n"
            "        db.query(models.Appointment)\n"
            "        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not appointment:\n"
            "        raise HTTPException(status_code=404, detail=\"Appointment not found\")\n"
            "    db.delete(appointment)\n"
            "    db.commit()\n"
            "    return {\"deleted\": True}\n\n\n"
            "@tenant_router.get(\"/services\", response_model=List[schemas.ServiceOut])\n"
            "def list_services(\n"
            "    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    return db.query(models.Service).filter(models.Service.tenant_id == tenant.id).all()\n\n\n"
            "@tenant_router.post(\"/services\", response_model=schemas.ServiceOut)\n"
            "def create_service(\n"
            "    handle: str,\n"
            "    payload: schemas.ServiceCreate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    service = models.Service(tenant_id=tenant.id, **payload.model_dump())\n"
            "    db.add(service)\n"
            "    db.commit()\n"
            "    db.refresh(service)\n"
            "    return service\n\n\n"
            "@tenant_router.get(\"/services/{service_id}\", response_model=schemas.ServiceOut)\n"
            "def get_service(\n"
            "    handle: str, service_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    service = (\n"
            "        db.query(models.Service)\n"
            "        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not service:\n"
            "        raise HTTPException(status_code=404, detail=\"Service not found\")\n"
            "    return service\n\n\n"
            "@tenant_router.put(\"/services/{service_id}\", response_model=schemas.ServiceOut)\n"
            "def update_service(\n"
            "    handle: str,\n"
            "    service_id: int,\n"
            "    payload: schemas.ServiceUpdate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    service = (\n"
            "        db.query(models.Service)\n"
            "        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not service:\n"
            "        raise HTTPException(status_code=404, detail=\"Service not found\")\n"
            "    for key, value in payload.model_dump(exclude_unset=True).items():\n"
            "        setattr(service, key, value)\n"
            "    db.commit()\n"
            "    db.refresh(service)\n"
            "    return service\n\n\n"
            "@tenant_router.delete(\"/services/{service_id}\")\n"
            "def delete_service(\n"
            "    handle: str, service_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    service = (\n"
            "        db.query(models.Service)\n"
            "        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not service:\n"
            "        raise HTTPException(status_code=404, detail=\"Service not found\")\n"
            "    db.delete(service)\n"
            "    db.commit()\n"
            "    return {\"deleted\": True}\n\n\n"
            "@tenant_router.get(\"/staff\", response_model=List[schemas.StaffOut])\n"
            "def list_staff(\n"
            "    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    return db.query(models.Staff).filter(models.Staff.tenant_id == tenant.id).all()\n\n\n"
            "@tenant_router.post(\"/staff\", response_model=schemas.StaffOut)\n"
            "def create_staff(\n"
            "    handle: str,\n"
            "    payload: schemas.StaffCreate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    staff = models.Staff(tenant_id=tenant.id, **payload.model_dump())\n"
            "    db.add(staff)\n"
            "    db.commit()\n"
            "    db.refresh(staff)\n"
            "    return staff\n\n\n"
            "@tenant_router.get(\"/staff/{staff_id}\", response_model=schemas.StaffOut)\n"
            "def get_staff(\n"
            "    handle: str, staff_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    staff = (\n"
            "        db.query(models.Staff)\n"
            "        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not staff:\n"
            "        raise HTTPException(status_code=404, detail=\"Staff not found\")\n"
            "    return staff\n\n\n"
            "@tenant_router.put(\"/staff/{staff_id}\", response_model=schemas.StaffOut)\n"
            "def update_staff(\n"
            "    handle: str,\n"
            "    staff_id: int,\n"
            "    payload: schemas.StaffUpdate,\n"
            "    tenant: models.Tenant = Depends(resolve_tenant),\n"
            "    db: Session = Depends(get_db),\n"
            "):\n"
            "    staff = (\n"
            "        db.query(models.Staff)\n"
            "        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not staff:\n"
            "        raise HTTPException(status_code=404, detail=\"Staff not found\")\n"
            "    for key, value in payload.model_dump(exclude_unset=True).items():\n"
            "        setattr(staff, key, value)\n"
            "    db.commit()\n"
            "    db.refresh(staff)\n"
            "    return staff\n\n\n"
            "@tenant_router.delete(\"/staff/{staff_id}\")\n"
            "def delete_staff(\n"
            "    handle: str, staff_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)\n"
            "):\n"
            "    staff = (\n"
            "        db.query(models.Staff)\n"
            "        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not staff:\n"
            "        raise HTTPException(status_code=404, detail=\"Staff not found\")\n"
            "    db.delete(staff)\n"
            "    db.commit()\n"
            "    return {\"deleted\": True}\n\n\n"
            "router.include_router(tenant_router)\n"
        )

    def _backend_requirements_bookings(self) -> str:
        return "fastapi\nuvicorn\nsqlalchemy\n"

    def _backend_readme_bookings(self) -> str:
        return (
            "# Backend (FastAPI Bookings)\n\n"
            "```bash\n"
            "python -m venv .venv\n"
            ".venv\\Scripts\\activate\n"
            "pip install -r requirements.txt\n"
            "python init_db.py\n"
            "uvicorn app.main:app --reload\n"
            "```\n\n"
            "## Tenant Setup\n\n"
            "Create a tenant:\n\n"
            "```bash\n"
            "curl -X POST http://127.0.0.1:8000/api/tenants \\\n"
            "  -H \"Content-Type: application/json\" \\\n"
            "  -d \"{\\\"display_name\\\":\\\"Demo Salon\\\",\\\"handle\\\":\\\"demo-salon\\\",\\\"recipe\\\":\\\"salon\\\"}\"\n"
            "```\n\n"
            "Open tenant docs:\n\n"
            "```\n"
            "http://127.0.0.1:8000/b/demo-salon/docs\n"
            "```\n\n"
            "## Endpoints\n\n"
            "- GET /health\n"
            "- POST /api/tenants\n"
            "- GET /api/tenants/{handle}\n"
            "- GET /b/{handle}/admin/meta\n"
            "- CRUD /b/{handle}/customers\n"
            "- CRUD /b/{handle}/appointments\n"
            "- CRUD /b/{handle}/services\n"
            "- CRUD /b/{handle}/staff\n"
        )

    def _backend_env_bookings(self) -> str:
        return "JOLOFF_DB_PATH=app/data/app.db\n"

    def _backend_init_script(self) -> str:
        return (
            "from datetime import datetime\n\n"
            "from app.db import SessionLocal, init_db\n"
            "from app import models\n\n\n"
            "def seed_demo(db):\n"
            "    tenant = db.query(models.Tenant).filter(models.Tenant.handle == \"demo-salon\").first()\n"
            "    if not tenant:\n"
            "        now = datetime.now(timezone.utc)\n"
            "        tenant = models.Tenant(\n"
            "            display_name=\"Demo Salon\",\n"
            "            handle=\"demo-salon\",\n"
            "            recipe=\"salon\",\n"
            "            created_at=now,\n"
            "            updated_at=now,\n"
            "        )\n"
            "        db.add(tenant)\n"
            "        db.commit()\n"
            "        db.refresh(tenant)\n"
            "    customer = db.query(models.Customer).filter(models.Customer.tenant_id == tenant.id).first()\n"
            "    if not customer:\n"
            "        customer = models.Customer(\n"
            "            tenant_id=tenant.id,\n"
            "            name=\"Jordan\",\n"
            "            phone=\"555-0100\",\n"
            "            email=\"jordan@example.com\",\n"
            "        )\n"
            "        db.add(customer)\n"
            "    service = (\n"
            "        db.query(models.Service)\n"
            "        .filter(models.Service.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not service:\n"
            "        service = models.Service(tenant_id=tenant.id, name=\"Basic Cut\", duration_minutes=30)\n"
            "        db.add(service)\n"
            "    staff = db.query(models.Staff).filter(models.Staff.tenant_id == tenant.id).first()\n"
            "    if not staff:\n"
            "        staff = models.Staff(tenant_id=tenant.id, name=\"Alex\", role=\"Stylist\")\n"
            "        db.add(staff)\n"
            "    db.commit()\n"
            "    appointment = (\n"
            "        db.query(models.Appointment)\n"
            "        .filter(models.Appointment.tenant_id == tenant.id)\n"
            "        .first()\n"
            "    )\n"
            "    if not appointment:\n"
            "        appointment = models.Appointment(\n"
            "            tenant_id=tenant.id,\n"
            "            customer_name=\"Jordan\",\n"
            "            start_time=\"2026-01-10T10:00:00\",\n"
            "            end_time=\"2026-01-10T10:30:00\",\n"
            "            service_id=service.id,\n"
            "            staff_id=staff.id,\n"
            "            customer_id=customer.id,\n"
            "        )\n"
            "        db.add(appointment)\n"
            "        db.commit()\n\n\n"
            "if __name__ == \"__main__\":\n"
            "    init_db()\n"
            "    session = SessionLocal()\n"
            "    try:\n"
            "        seed_demo(session)\n"
            "    finally:\n"
            "        session.close()\n"
            "    print(\"Database initialized\")\n"
        )

    def _mobile_pubspec(self) -> str:
        return (
            "name: jollof_mobile\n"
            "description: Jollof mobile scaffold\n"
            "publish_to: 'none'\n"
            "version: 0.1.0\n\n"
            "environment:\n"
            "  sdk: '>=3.0.0 <4.0.0'\n\n"
            "dependencies:\n"
            "  flutter:\n"
            "    sdk: flutter\n"
            "  cupertino_icons: ^1.0.8\n\n"
            "dev_dependencies:\n"
            "  flutter_test:\n"
            "    sdk: flutter\n\n"
            "flutter:\n"
            "  uses-material-design: true\n"
        )

    def _mobile_main(self) -> str:
        return (
            "import 'package:flutter/material.dart';\n\n"
            "void main() {\n"
            "  runApp(const JollofApp());\n"
            "}\n\n"
            "class JollofApp extends StatelessWidget {\n"
            "  const JollofApp({super.key});\n\n"
            "  @override\n"
            "  Widget build(BuildContext context) {\n"
            "    return MaterialApp(\n"
            "      title: 'Jollof Mobile',\n"
            "      home: Scaffold(\n"
            "        appBar: AppBar(title: const Text('Jollof Mobile')),\n"
            "        body: const Center(child: Text('Hello from Jollof mobile')),\n"
            "      ),\n"
            "    );\n"
            "  }\n"
            "}\n"
        )

    def _mobile_main_bookings(self) -> str:
        return (
            "import 'package:flutter/material.dart';\n"
            "import 'screens/home_screen.dart';\n"
            "import 'screens/book_appointment_screen.dart';\n"
            "import 'screens/my_appointments_screen.dart';\n\n"
            "void main() {\n"
            "  runApp(const JollofApp());\n"
            "}\n\n"
            "class JollofApp extends StatelessWidget {\n"
            "  const JollofApp({super.key});\n\n"
            "  @override\n"
            "  Widget build(BuildContext context) {\n"
            "    return MaterialApp(\n"
            "      title: 'Jollof Bookings',\n"
            "      initialRoute: '/',\n"
            "      routes: {\n"
            "        '/': (_) => const HomeScreen(),\n"
            "        '/book': (_) => const BookAppointmentScreen(),\n"
            "        '/mine': (_) => const MyAppointmentsScreen(),\n"
            "      },\n"
            "    );\n"
            "  }\n"
            "}\n"
        )

    def _mobile_api_client(self) -> str:
        return (
            "class ApiClient {\n"
            "  final String baseUrl;\n"
            "  ApiClient({this.baseUrl = 'http://localhost:8000'});\n\n"
            "  Future<List<String>> fetchAppointments() async {\n"
            "    return [];\n"
            "  }\n"
            "}\n"
        )

    def _mobile_home_screen(self) -> str:
        return (
            "import 'package:flutter/material.dart';\n\n"
            "class HomeScreen extends StatelessWidget {\n"
            "  const HomeScreen({super.key});\n\n"
            "  @override\n"
            "  Widget build(BuildContext context) {\n"
            "    return Scaffold(\n"
            "      appBar: AppBar(title: const Text('Bookings Home')),\n"
            "      body: Center(\n"
            "        child: Column(\n"
            "          mainAxisAlignment: MainAxisAlignment.center,\n"
            "          children: [\n"
            "            ElevatedButton(\n"
            "              onPressed: () => Navigator.pushNamed(context, '/book'),\n"
            "              child: const Text('Book Appointment'),\n"
            "            ),\n"
            "            const SizedBox(height: 16),\n"
            "            ElevatedButton(\n"
            "              onPressed: () => Navigator.pushNamed(context, '/mine'),\n"
            "              child: const Text('My Appointments'),\n"
            "            ),\n"
            "          ],\n"
            "        ),\n"
            "      ),\n"
            "    );\n"
            "  }\n"
            "}\n"
        )

    def _mobile_book_screen(self) -> str:
        return (
            "import 'package:flutter/material.dart';\n\n"
            "class BookAppointmentScreen extends StatelessWidget {\n"
            "  const BookAppointmentScreen({super.key});\n\n"
            "  @override\n"
            "  Widget build(BuildContext context) {\n"
            "    return Scaffold(\n"
            "      appBar: AppBar(title: const Text('Book Appointment')),\n"
            "      body: const Center(\n"
            "        child: Text('Booking form goes here'),\n"
            "      ),\n"
            "    );\n"
            "  }\n"
            "}\n"
        )

    def _mobile_my_appointments_screen(self) -> str:
        return (
            "import 'package:flutter/material.dart';\n\n"
            "class MyAppointmentsScreen extends StatelessWidget {\n"
            "  const MyAppointmentsScreen({super.key});\n\n"
            "  @override\n"
            "  Widget build(BuildContext context) {\n"
            "    return Scaffold(\n"
            "      appBar: AppBar(title: const Text('My Appointments')),\n"
            "      body: const Center(\n"
            "        child: Text('Appointments list goes here'),\n"
            "      ),\n"
            "    );\n"
            "  }\n"
            "}\n"
        )
    def _mobile_readme(self) -> str:
        return (
            "# Mobile (Flutter)\n\n"
            "```bash\n"
            "flutter pub get\n"
            "flutter run\n"
            "```\n"
        )

    def _mobile_gitignore(self) -> str:
        return ".dart_tool/\n.build/\nandroid/\nios/\n"

    def _commands_to_run(self, recipe: str) -> Dict[str, List[str]]:
        backend_commands = [
            "cd backend",
            "python -m venv .venv",
            ".venv\\Scripts\\activate",
            "pip install -r requirements.txt",
        ]
        if recipe == "bookings":
            backend_commands.append("python init_db.py")
        backend_commands.append("uvicorn app.main:app --reload")
        return {
            "backend": backend_commands,
            "mobile": [
                "cd mobile",
                "flutter pub get",
                "flutter run",
            ],
        }

    def _recipe_metadata(self, recipe: str) -> Dict[str, Any]:
        if recipe == "bookings":
            return {"name": "bookings", "variant": "bookings_v1"}
        return {"name": recipe, "variant": "base_v1"}
