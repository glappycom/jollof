import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.db import get_connection


class Storage:
    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _serialize(self, data: Any) -> str:
        return json.dumps(data, ensure_ascii=True)

    def _deserialize(self, data: str) -> Any:
        return json.loads(data)

    def _row_to_board(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "intent_text": row["intent_text"],
            "detected_recipe": row["detected_recipe"],
            "requirements": self._deserialize(row["requirements"]),
            "architecture": self._deserialize(row["architecture"]),
            "tasks": self._deserialize(row["tasks"]),
            "artifacts": self._deserialize(row["artifacts"]),
            "status": row["status"],
        }

    def create_board(
        self,
        name: str,
        intent_text: str,
        detected_recipe: str,
        requirements: Dict[str, Any],
        architecture: Dict[str, Any],
        tasks: List[Dict[str, Any]],
        artifacts: List[Dict[str, Any]],
        status: str,
    ) -> Dict[str, Any]:
        now = self._now()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO working_boards
            (name, created_at, updated_at, intent_text, detected_recipe, requirements, architecture, tasks, artifacts, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                now,
                now,
                intent_text,
                detected_recipe,
                self._serialize(requirements),
                self._serialize(architecture),
                self._serialize(tasks),
                self._serialize(artifacts),
                status,
            ),
        )
        board_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_board(board_id)

    def get_board(self, board_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM working_boards WHERE id = ?", (board_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_board(row)

    def list_boards(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM working_boards ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_board(row) for row in rows if row]

    def merge_requirements(self, board: Dict[str, Any], answers: Dict[str, Any]) -> Dict[str, Any]:
        requirements = dict(board.get("requirements", {}))
        existing_answers = requirements.get("answers", {})
        requirements["answers"] = {**existing_answers, **answers}
        return requirements

    def _insert_version(self, board: Dict[str, Any]) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        snapshot = self._serialize(board)
        cursor.execute(
            """
            INSERT INTO board_versions (board_id, snapshot, created_at)
            VALUES (?, ?, ?)
            """,
            (board["id"], snapshot, self._now()),
        )
        conn.commit()
        conn.close()

    def update_board(self, board_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        current = self.get_board(board_id)
        if not current:
            return None
        self._insert_version(current)
        updated = {**current, **updates, "updated_at": self._now()}
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE working_boards
            SET name = ?, updated_at = ?, intent_text = ?, detected_recipe = ?, requirements = ?, architecture = ?,
                tasks = ?, artifacts = ?, status = ?
            WHERE id = ?
            """,
            (
                updated["name"],
                updated["updated_at"],
                updated["intent_text"],
                updated["detected_recipe"],
                self._serialize(updated["requirements"]),
                self._serialize(updated["architecture"]),
                self._serialize(updated["tasks"]),
                self._serialize(updated["artifacts"]),
                updated["status"],
                board_id,
            ),
        )
        conn.commit()
        conn.close()
        return self.get_board(board_id)

    def create_deployment(
        self,
        board_id: int,
        tenant_slug: str,
        public_url: str,
        admin_url: str,
        qr_code_path: str,
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO deployments (board_id, tenant_slug, public_url, admin_url, qr_code_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (board_id, tenant_slug, public_url, admin_url, qr_code_path, self._now()),
        )
        conn.commit()
        conn.close()
        return self.get_deployment_by_slug(tenant_slug)

    def get_deployment_by_slug(self, tenant_slug: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deployments WHERE tenant_slug = ?", (tenant_slug,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "id": row["id"],
            "board_id": row["board_id"],
            "tenant_slug": row["tenant_slug"],
            "public_url": row["public_url"],
            "admin_url": row["admin_url"],
            "qr_code_path": row["qr_code_path"],
            "created_at": row["created_at"],
        }

    def get_deployment_by_board(self, board_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deployments WHERE board_id = ?", (board_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "id": row["id"],
            "board_id": row["board_id"],
            "tenant_slug": row["tenant_slug"],
            "public_url": row["public_url"],
            "admin_url": row["admin_url"],
            "qr_code_path": row["qr_code_path"],
            "created_at": row["created_at"],
        }

    def tenant_handle_exists(self, handle: str) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM tenants WHERE handle = ?", (handle,))
        row = cursor.fetchone()
        conn.close()
        return row is not None

    def create_tenant(
        self,
        display_name: str,
        handle: str,
        recipe: str,
        board_id: Optional[int],
        public_url: str,
        admin_url: str,
    ) -> Dict[str, Any]:
        now = self._now()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tenants
            (display_name, handle, recipe, board_id, created_at, updated_at, public_url, admin_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (display_name, handle, recipe, board_id, now, now, public_url, admin_url),
        )
        tenant_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_tenant_by_id(tenant_id)

    def get_tenant_by_id(self, tenant_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tenants WHERE id = ?", (tenant_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_tenant(row)

    def get_tenant_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tenants WHERE handle = ?", (handle,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_tenant(row)

    def _row_to_tenant(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        return {
            "id": row["id"],
            "display_name": row["display_name"],
            "handle": row["handle"],
            "recipe": row["recipe"],
            "board_id": row["board_id"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "public_url": row["public_url"],
            "admin_url": row["admin_url"],
        }
