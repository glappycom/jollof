from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.routes import resolve_tenant, router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Jollof Bookings Backend", lifespan=lifespan)
app.include_router(router)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/b/{handle}/openapi.json", include_in_schema=False)
def tenant_openapi(handle: str, db: Session = Depends(get_db)):
    resolve_tenant(handle, db)
    return get_openapi(title=app.title, version="0.1.0", routes=app.routes)


@app.get("/b/{handle}/docs", include_in_schema=False)
def tenant_docs(handle: str, db: Session = Depends(get_db)):
    resolve_tenant(handle, db)
    return get_swagger_ui_html(openapi_url=f"/b/{handle}/openapi.json", title="Jollof Bookings Docs")
