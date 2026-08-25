import asyncio
from app.db import engine, Base
import app.models  # Registers all SQLAlchemy models on Base.metadata

async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_tables())
