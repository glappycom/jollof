from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.routes import router
from app.core.db import init_db

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Jollof IDE Engine Room", version="0.1.0", lifespan=lifespan)


app.include_router(router)
