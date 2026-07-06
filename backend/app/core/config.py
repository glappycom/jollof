from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    _base_dir: Path = Path(__file__).resolve().parents[1]
    db_path: str = os.getenv("JOLOFF_DB_PATH", str(_base_dir / "data" / "jollof.db"))


settings = Settings()
