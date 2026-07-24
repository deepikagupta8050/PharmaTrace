from sqlalchemy import create_engine
from dotenv import load_dotenv
import os


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


engine = create_engine(DATABASE_URL)


if __name__ == "__main__":
    try:
        connection = engine.connect()
        print("Database se connection successful!")
        connection.close()
    except Exception as e:
        print("Connection failed:", e)