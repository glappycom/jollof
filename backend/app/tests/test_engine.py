import os
import importlib
import shutil
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


def test_intent_engine_classification() -> None:
    from app.services.intent_engine import IntentEngine

    engine = IntentEngine()
    result = engine.analyze("We need a booking system for appointments")
    assert result.detected_recipe == "bookings"

    result = engine.analyze("Build a student information system for a school")
    assert result.detected_recipe == "school_sis"

    result = engine.analyze("Sell products online with checkout")
    assert result.detected_recipe == "commerce"

    result = engine.analyze("Manage memberships and subscriptions")
    assert result.detected_recipe == "membership"

    result = engine.analyze("Something totally new")
    assert result.detected_recipe == "unknown"


def test_slugify_handles() -> None:
    from app.services.tenants import slugify

    assert slugify("Igbudu Beauty Lounge") == "igbudu-beauty-lounge"
    assert slugify("  --- ") == "business"
    assert slugify("Hello__World!!!") == "hello-world"
    assert slugify("A" * 80) == "a" * 50


@pytest.mark.anyio
async def test_board_lifecycle() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test.db")
        os.environ["JOLOFF_DB_PATH"] = db_path
        import app.core.config
        importlib.reload(app.core.config)
        import app.core.db
        importlib.reload(app.core.db)
        import app.main
        importlib.reload(app.main)
        app.core.db.init_db()

        board_root = None
        transport = ASGITransport(app=app.main.app)
        try:
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post("/api/boards", json={"intent_text": "Book appointments"})
                assert response.status_code == 200
                board = response.json()
                board_id = board["id"]
                assert board["status"] == "draft"

                response = await client.post(f"/api/boards/{board_id}/plan")
                assert response.status_code == 200
                planned = response.json()
                assert planned["status"] == "planned"
                assert planned["tasks"]

                response = await client.post(f"/api/boards/{board_id}/scaffold")
                assert response.status_code == 200
                scaffolded = response.json()
                assert scaffolded["status"] == "scaffolding"
                assert scaffolded["artifacts"]

                repo_root = Path(__file__).resolve().parents[3]
                workspace_root = repo_root / "workspace"
                board_root = workspace_root / f"board_{board_id}"
                expected_files = [
                    board_root / "README.md",
                    board_root / "jollof.json",
                    board_root / "backend" / "app" / "main.py",
                    board_root / "backend" / "requirements.txt",
                    board_root / "backend" / "README.md",
                    board_root / "backend" / ".env.example",
                    board_root / "mobile" / "pubspec.yaml",
                    board_root / "mobile" / "lib" / "main.dart",
                    board_root / "mobile" / "README.md",
                    board_root / "mobile" / ".gitignore",
                ]
                for path in expected_files:
                    assert path.exists()

                response = await client.post(f"/api/boards/{board_id}/export")
                assert response.status_code == 200
                export_payload = response.json()
                assert export_payload["planned_files"]
        finally:
            if board_root and board_root.exists():
                shutil.rmtree(board_root)


@contextmanager
def load_scaffold_app(board_root: Path):
    backend_root = board_root / "backend"
    original_sys_path = list(sys.path)
    removed_modules = {}
    for name in list(sys.modules):
        if name == "app" or name.startswith("app."):
            removed_modules[name] = sys.modules.pop(name)
    sys.path.insert(0, str(backend_root))
    try:
        module = importlib.import_module("app.main")
        yield module.app
    finally:
        for name in list(sys.modules):
            if name == "app" or name.startswith("app."):
                sys.modules.pop(name, None)
        sys.path = original_sys_path
        sys.modules.update(removed_modules)


@pytest.mark.anyio
async def test_bookings_scaffold_endpoints() -> None:
    board_root = None
    tmpdir = tempfile.mkdtemp()
    try:
        db_path = os.path.join(tmpdir, "test.db")
        os.environ["JOLOFF_DB_PATH"] = db_path
        import app.core.config
        importlib.reload(app.core.config)
        import app.core.db
        importlib.reload(app.core.db)
        import app.main
        importlib.reload(app.main)
        app.core.db.init_db()

        transport = ASGITransport(app=app.main.app)
        try:
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/boards", json={"intent_text": "Book appointments for clients"}
                )
                assert response.status_code == 200
                board = response.json()
                board_id = board["id"]

                response = await client.post(f"/api/boards/{board_id}/scaffold")
                assert response.status_code == 200

                repo_root = Path(__file__).resolve().parents[3]
                workspace_root = repo_root / "workspace"
                board_root = workspace_root / f"board_{board_id}"
                assert board_root.exists()

                scaffold_db_path = os.path.join(tmpdir, "scaffold.db")
                os.environ["JOLOFF_DB_PATH"] = scaffold_db_path
                with load_scaffold_app(board_root) as scaffold_app:
                    import app.db as scaffold_db

                    scaffold_db.init_db()
                    api_transport = ASGITransport(app=scaffold_app)
                    async with AsyncClient(transport=api_transport, base_url="http://test") as api_client:
                        health = await api_client.get("/health")
                        assert health.status_code == 200
                        assert health.json()["status"] == "ok"

                        appointments = await api_client.get("/b/demo-salon/appointments")
                        assert appointments.status_code == 200
        finally:
            if board_root and board_root.exists():
                shutil.rmtree(board_root)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.mark.anyio
async def test_bookings_tenant_isolation() -> None:
    board_root = None
    tmpdir = tempfile.mkdtemp()
    try:
        db_path = os.path.join(tmpdir, "test.db")
        os.environ["JOLOFF_DB_PATH"] = db_path
        import app.core.config
        importlib.reload(app.core.config)
        import app.core.db
        importlib.reload(app.core.db)
        import app.main
        importlib.reload(app.main)
        app.core.db.init_db()

        transport = ASGITransport(app=app.main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/boards", json={"intent_text": "Need a booking system"}
            )
            board_id = response.json()["id"]
            await client.post(f"/api/boards/{board_id}/scaffold")

        repo_root = Path(__file__).resolve().parents[3]
        workspace_root = repo_root / "workspace"
        board_root = workspace_root / f"board_{board_id}"

        scaffold_db_path = os.path.join(tmpdir, "scaffold.db")
        os.environ["JOLOFF_DB_PATH"] = scaffold_db_path
        with load_scaffold_app(board_root) as scaffold_app:
            import app.db as scaffold_db

            scaffold_db.init_db()
            api_transport = ASGITransport(app=scaffold_app)
            async with AsyncClient(transport=api_transport, base_url="http://test") as api_client:
                response = await api_client.post(
                    "/api/tenants",
                    json={"display_name": "Tenant A", "handle": "tenant-a", "recipe": "salon"},
                )
                assert response.status_code == 200
                response = await api_client.post(
                    "/api/tenants",
                    json={"display_name": "Tenant B", "handle": "tenant-b", "recipe": "salon"},
                )
                assert response.status_code == 200

                customer_a = await api_client.post(
                    "/b/tenant-a/customers",
                    json={"name": "Customer A", "phone": "111-111", "email": "a@example.com"},
                )
                customer_b = await api_client.post(
                    "/b/tenant-b/customers",
                    json={"name": "Customer B", "phone": "222-222", "email": "b@example.com"},
                )
                service_a = await api_client.post(
                    "/b/tenant-a/services", json={"name": "Cut A", "duration_minutes": 30}
                )
                staff_a = await api_client.post(
                    "/b/tenant-a/staff", json={"name": "Sam", "role": "Stylist"}
                )
                service_b = await api_client.post(
                    "/b/tenant-b/services", json={"name": "Cut B", "duration_minutes": 45}
                )
                staff_b = await api_client.post(
                    "/b/tenant-b/staff", json={"name": "Bea", "role": "Stylist"}
                )

                service_a_id = service_a.json()["id"]
                staff_a_id = staff_a.json()["id"]
                service_b_id = service_b.json()["id"]
                staff_b_id = staff_b.json()["id"]
                customer_a_id = customer_a.json()["id"]
                customer_b_id = customer_b.json()["id"]

                await api_client.post(
                    "/b/tenant-a/appointments",
                    json={
                        "customer_name": "Alex",
                        "start_time": "2026-01-10T12:00:00",
                        "end_time": "2026-01-10T12:30:00",
                        "service_id": service_a_id,
                        "staff_id": staff_a_id,
                        "customer_id": customer_a_id,
                    },
                )
                await api_client.post(
                    "/b/tenant-b/appointments",
                    json={
                        "customer_name": "Blake",
                        "start_time": "2026-01-10T13:00:00",
                        "end_time": "2026-01-10T13:45:00",
                        "service_id": service_b_id,
                        "staff_id": staff_b_id,
                        "customer_id": customer_b_id,
                    },
                )

                customers_a = await api_client.get("/b/tenant-a/customers")
                customers_b = await api_client.get("/b/tenant-b/customers")
                assert len(customers_a.json()) == 1
                assert len(customers_b.json()) == 1
                assert customers_a.json()[0]["name"] == "Customer A"
                assert customers_b.json()[0]["name"] == "Customer B"

                services_a = await api_client.get("/b/tenant-a/services")
                services_b = await api_client.get("/b/tenant-b/services")
                assert len(services_a.json()) == 1
                assert len(services_b.json()) == 1
                assert services_a.json()[0]["name"] == "Cut A"
                assert services_b.json()[0]["name"] == "Cut B"

                appointments_a = await api_client.get("/b/tenant-a/appointments")
                appointments_b = await api_client.get("/b/tenant-b/appointments")
                assert len(appointments_a.json()) == 1
                assert len(appointments_b.json()) == 1
                assert appointments_a.json()[0]["customer_name"] == "Alex"
                assert appointments_b.json()[0]["customer_name"] == "Blake"
    finally:
        if board_root and board_root.exists():
            shutil.rmtree(board_root)
        shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.mark.anyio
async def test_deploy_board_creates_tenant() -> None:
    board_root = None
    deployment = None
    tenants_root = None
    board_id = None
    tmpdir = tempfile.mkdtemp()
    try:
        db_path = os.path.join(tmpdir, "test.db")
        os.environ["JOLOFF_DB_PATH"] = db_path
        import app.core.config
        importlib.reload(app.core.config)
        import app.core.db
        importlib.reload(app.core.db)
        import app.main
        importlib.reload(app.main)
        app.core.db.init_db()

        transport = ASGITransport(app=app.main.app)
        try:
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/boards", json={"intent_text": "Need a booking system"}
                )
                assert response.status_code == 200
                board = response.json()
                board_id = board["id"]

                response = await client.post(f"/api/boards/{board_id}/scaffold")
                assert response.status_code == 200

                response = await client.post(f"/api/boards/{board_id}/deploy")
                assert response.status_code == 200
                deployment = response.json()
                assert deployment["tenant_slug"]
                assert deployment["public_url"].startswith("https://")
                assert deployment["qr_code_url"].endswith("qr.png")

                repo_root = Path(__file__).resolve().parents[3]
                tenants_root = repo_root / "tenants"
                tenant_root = tenants_root / deployment["tenant_slug"]
                assert tenant_root.exists()
                assert (tenant_root / "qr.png").exists()
                assert (tenant_root / "backend").exists()
                assert (tenant_root / "mobile").exists()
        finally:
            if board_id is not None:
                repo_root = Path(__file__).resolve().parents[3]
                workspace_root = repo_root / "workspace"
                board_root = workspace_root / f"board_{board_id}"
                if board_root.exists():
                    shutil.rmtree(board_root)
            if deployment and tenants_root:
                shutil.rmtree(tenants_root / deployment["tenant_slug"], ignore_errors=True)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.mark.anyio
async def test_handle_check_and_tenant_creation() -> None:
    tmpdir = tempfile.mkdtemp()
    os.environ["JOLOFF_HANDLE_SUFFIX"] = "1234"
    try:
        db_path = os.path.join(tmpdir, "test.db")
        os.environ["JOLOFF_DB_PATH"] = db_path
        import app.core.config
        importlib.reload(app.core.config)
        import app.core.db
        importlib.reload(app.core.db)
        import app.main
        importlib.reload(app.main)
        app.core.db.init_db()

        transport = ASGITransport(app=app.main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/handles/check",
                json={"display_name": "Igbudu Beauty Lounge"},
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["available"] is True
            assert payload["suggested_handle"] == "igbudu-beauty-lounge"

            response = await client.post(
                "/api/tenants",
                json={"display_name": "Igbudu Beauty Lounge", "recipe": "salon"},
            )
            assert response.status_code == 200
            tenant = response.json()
            assert tenant["handle"] == "igbudu-beauty-lounge"
            assert tenant["public_url"].endswith("/b/igbudu-beauty-lounge")

            response = await client.post(
                "/api/handles/check",
                json={
                    "display_name": "Igbudu Beauty Lounge",
                    "preferred_handle": "igbudu-beauty-lounge",
                    "city": "Warri",
                },
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["available"] is False
            assert payload["alternatives"][0] == "igbudu-beauty-lounge-2"
            assert "igbudu-beauty-lounge-warri" in payload["alternatives"]
            assert "igbudu-beauty-lounge-1234" in payload["alternatives"]

            response = await client.post(
                "/api/tenants",
                json={"display_name": "Igbudu Beauty Lounge"},
            )
            assert response.status_code == 409
            conflict = response.json()
            assert "alternatives" in conflict["detail"]

            response = await client.get("/api/tenants/igbudu-beauty-lounge")
            assert response.status_code == 200
            fetched = response.json()
            assert fetched["handle"] == "igbudu-beauty-lounge"
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
