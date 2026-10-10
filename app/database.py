import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "portfolio.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS visitor_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0
        )
    """)
    cursor.execute("SELECT COUNT(*) FROM visitor_stats")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO visitor_stats (page_views, likes) VALUES (128, 42)")
    conn.commit()
    conn.close()

def save_message(name: str, email: str, subject: str, message: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
        (name, email, subject, message)
    )
    conn.commit()
    conn.close()

def get_all_messages():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, subject, message, created_at FROM contact_messages ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def increment_page_views():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE visitor_stats SET page_views = page_views + 1 WHERE id = 1")
    conn.commit()
    cursor.execute("SELECT page_views, likes FROM visitor_stats WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {"page_views": 1, "likes": 0}

def increment_likes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE visitor_stats SET likes = likes + 1 WHERE id = 1")
    conn.commit()
    cursor.execute("SELECT page_views, likes FROM visitor_stats WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {"page_views": 1, "likes": 1}

