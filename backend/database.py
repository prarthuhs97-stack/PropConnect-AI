
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

# Connect to PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for database models
Base = declarative_base()


# Provide database sessions to API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
