import sqlite3
import json
import os
import uuid
from datetime import datetime

# 📦 Get absolute path to this file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "chats.db")

# 📦 Ensure database folder exists
os.makedirs(BASE_DIR, exist_ok=True)

# 🧩 Connect to SQLite
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()
# ---------------------------------------------------------------------
# 🧱 1️⃣ Table: Single chat per user (legacy support)
# ---------------------------------------------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS chats (
    user_id TEXT PRIMARY KEY,
    messages TEXT
)
""")

# ---------------------------------------------------------------------
# 🧱 2️⃣ Table: Multiple chat sessions per user
# ---------------------------------------------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    messages TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()

# ---------------------------------------------------------------------
# 💾 Save chat (for single-chat users)
# ---------------------------------------------------------------------
def save_chat(user_id: str, messages: list):
    """
    Save the entire chat for a user.
    If the user already has one, it overwrites it.
    """
    messages_json = json.dumps(messages)
    cursor.execute(
        "REPLACE INTO chats (user_id, messages) VALUES (?, ?)",
        (user_id, messages_json)
    )
    conn.commit()

# ---------------------------------------------------------------------
# 📤 Load chat (for single-chat users)
# ---------------------------------------------------------------------
def load_chat(user_id: str) -> list:
    """
    Load a user's chat messages (legacy single chat).
    Returns [] if none found.
    """
    cursor.execute("SELECT messages FROM chats WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row[0]:
        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            return []
    return []

# ---------------------------------------------------------------------
# 🪄 Create a new chat session for a user
# ---------------------------------------------------------------------
def create_session(user_id: str, title: str = "New Chat"):
    """
    Create a new chat session for a user with a title.
    Returns the generated session_id.
    """
    session_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO chat_sessions (session_id, user_id, title, messages, created_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, user_id, title, json.dumps([]), datetime.now())
    )
    conn.commit()
    return session_id

# ---------------------------------------------------------------------
# 📋 Get all chat sessions of a user
# ---------------------------------------------------------------------
def get_sessions(user_id: str):
    """
    Return a list of all chat sessions for a given user.
    Each element contains session_id, title, and created_at.
    """
    cursor.execute(
        "SELECT session_id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    return [
        {"session_id": r[0], "title": r[1], "created_at": r[2]}
        for r in rows
    ]

# ---------------------------------------------------------------------
# 💾 Save messages for a specific session
# ---------------------------------------------------------------------
def save_session(session_id: str, messages: list):
    """
    Save (update) all messages for a specific session.
    """
    messages_json = json.dumps(messages)
    cursor.execute(
        "UPDATE chat_sessions SET messages = ? WHERE session_id = ?",
        (messages_json, session_id)
    )
    conn.commit()

# ---------------------------------------------------------------------
# 📤 Load messages from a specific session
# ---------------------------------------------------------------------
def load_session(session_id: str) -> list:
    """
    Load all chat messages from a specific session.
    Returns [] if no messages exist.
    """
    cursor.execute("SELECT messages FROM chat_sessions WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    if row and row[0]:
        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            return []
    return []