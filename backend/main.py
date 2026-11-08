from fastapi import FastAPI
from routes.auth import router as auth_router

app = FastAPI(
    title="PropConnect AI",
    description="AI-powered real estate lead management platform",
    version="1.0.0"
)

app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "Welcome to PropConnect AI"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}