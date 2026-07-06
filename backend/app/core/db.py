import os
import sqlite3

from app.core.config import settings


def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(settings.db_path), exist_ok=True)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS working_boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            intent_text TEXT NOT NULL,
            detected_recipe TEXT NOT NULL,
            requirements TEXT NOT NULL,
            architecture TEXT NOT NULL,
            tasks TEXT NOT NULL,
            artifacts TEXT NOT NULL,
            status TEXT NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS deployments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            board_id INTEGER NOT NULL,
            tenant_slug TEXT NOT NULL UNIQUE,
            public_url TEXT NOT NULL,
            admin_url TEXT NOT NULL,
            qr_code_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(board_id) REFERENCES working_boards(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT NOT NULL,
            handle TEXT NOT NULL UNIQUE,
            recipe TEXT NOT NULL,
            board_id INTEGER NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            public_url TEXT NOT NULL,
            admin_url TEXT NOT NULL,
            FOREIGN KEY(board_id) REFERENCES working_boards(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS board_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            board_id INTEGER NOT NULL,
            snapshot TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(board_id) REFERENCES working_boards(id)
        )
        """
    )
    conn.commit()
    conn.close()
