import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.getenv("JOLOFF_DB_PATH", str(BASE_DIR / "data" / "app.db"))
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    from app import models
    Base.metadata.create_all(bind=engine)
    ensure_demo_tenant()


def ensure_demo_tenant() -> None:
    from datetime import datetime, timezone
    from app import models
    db = SessionLocal()
    try:
        tenant = db.query(models.Tenant).filter(models.Tenant.handle == "demo-salon").first()
        if not tenant:
            now = datetime.now(timezone.utc)
            tenant = models.Tenant(
                display_name="Demo Salon",
                handle="demo-salon",
                recipe="salon",
                created_at=now,
                updated_at=now,
            )
            db.add(tenant)
            db.commit()
    finally:
        db.close()
