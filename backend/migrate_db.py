import sys
import os
sys.path.insert(0, r"c:\Users\taha\webinarflow-ai\backend")
import asyncio
from app.db import engine, Base
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Checking/adding columns and tables...")
        
        # Check users columns
        res = await conn.execute(text("PRAGMA table_info(users)"))
        user_columns = [row[1] for row in res.fetchall()]
        print("Existing user columns:", user_columns)
        
        if "email_verified" not in user_columns:
            print("Adding email_verified column to users...")
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0"))
                await conn.execute(text("UPDATE users SET email_verified = 1 WHERE hashed_password IS NULL OR is_verified = 1"))
                print("Added email_verified column and backfilled verified users.")
            except Exception as e:
                print(f"Error adding email_verified column: {e}")
                
        # Check webinars columns
        res = await conn.execute(text("PRAGMA table_info(webinars)"))
        columns = [row[1] for row in res.fetchall()]
        
        if "is_paid" not in columns:
            print("Adding is_paid column...")
            await conn.execute(text("ALTER TABLE webinars ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT 0"))
        
        if "price_cents" not in columns:
            print("Adding price_cents column...")
            await conn.execute(text("ALTER TABLE webinars ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0"))
            
        if "currency" not in columns:
            print("Adding currency column...")
            await conn.execute(text("ALTER TABLE webinars ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'usd'"))
            
        if "payment_gateway" not in columns:
            print("Adding payment_gateway column...")
            try:
                await conn.execute(text("ALTER TABLE webinars ADD COLUMN payment_gateway VARCHAR(16) DEFAULT 'stripe'"))
                print('Added payment_gateway column')
            except Exception as e:
                print(f'payment_gateway column may already exist: {e}')
                
        # Create all tables (including email_verification_tokens) if missing
        await conn.run_sync(Base.metadata.create_all)
            
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
