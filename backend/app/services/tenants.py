import os
import re
from typing import Dict, List, Optional

from app.core.storage import Storage


PUBLIC_BASE_URL = "https://jollof.app/b"


def slugify(display_name: str) -> str:
    value = display_name.strip().lower()
    value = value.replace("_", " ")
    value = re.sub(r"[^a-z0-9\s-]", " ", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")
    if not value:
        value = "business"
    return value[:50]


class TenantService:
    def __init__(self, storage: Storage) -> None:
        self.storage = storage

    def check_handle(
        self, display_name: str, preferred_handle: Optional[str], city: Optional[str]
    ) -> Dict[str, object]:
        base = slugify(preferred_handle or display_name)
        available = not self.storage.tenant_handle_exists(base)
        alternatives: List[str] = []
        if not available:
            alternatives = self._build_alternatives(base, city)
        suggested = base if available else (alternatives[0] if alternatives else base)
        return {
            "suggested_handle": suggested,
            "available": available,
            "alternatives": alternatives[:5],
        }

    def create_tenant(
        self,
        display_name: str,
        handle: Optional[str],
        recipe: str,
        board_id: Optional[int],
    ) -> Dict[str, object]:
        normalized = slugify(handle or display_name)
        if self.storage.tenant_handle_exists(normalized):
            alternatives = self._build_alternatives(normalized, None)
            raise TenantConflict(normalized, alternatives)
        public_url = f"{PUBLIC_BASE_URL}/{normalized}"
        admin_url = f"{PUBLIC_BASE_URL}/{normalized}/admin"
        return self.storage.create_tenant(
            display_name=display_name,
            handle=normalized,
            recipe=recipe or "salon",
            board_id=board_id,
            public_url=public_url,
            admin_url=admin_url,
        )

    def _build_alternatives(self, base: str, city: Optional[str]) -> List[str]:
        candidates = [f"{base}-2", f"{base}-3"]
        if city:
            city_slug = slugify(city)
            if city_slug:
                candidates.append(f"{base}-{city_slug}")
        suffix = os.getenv("JOLOFF_HANDLE_SUFFIX", "4321")
        suffix = re.sub(r"[^0-9]", "", suffix)[:4] or "4321"
        candidates.append(f"{base}-{suffix}")
        available = [c for c in candidates if not self.storage.tenant_handle_exists(c)]
        return available[:5]


class TenantConflict(Exception):
    def __init__(self, handle: str, alternatives: List[str]) -> None:
        super().__init__(f"Handle '{handle}' is already taken")
        self.handle = handle
        self.alternatives = alternatives
