from fastapi import FastAPI
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.projects import router as projects_router
from routes.facts import router as facts_router
from routes.chat import router as chat_router
from routes.leads import router as leads_router
from routes.visits import router as visits_router
from database import Base, engine
import models
from fastapi.middleware.cors import CORSMiddleware
from config import settings
app = FastAPI(
    title="PropConnect AI",
    description="AI-powered real estate lead management platform",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(projects_router)
app.include_router(facts_router)
app.include_router(chat_router)
app.include_router(leads_router)
app.include_router(visits_router)
@app.get("/")
def home():
    return {"message": "Welcome to PropConnect AI"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}