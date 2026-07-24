from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Database:")
    print(conn.execute(text("SELECT current_database(), current_user")).fetchall())

    print("\nSchema:")
    print(conn.execute(text("SELECT current_schema()")).fetchall())

    print("\nTables:")
    rows = conn.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)).fetchall()

    print(rows)