from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db import init_db
from app.routes import router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Jollof Bookings Backend", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
