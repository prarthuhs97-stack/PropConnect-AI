from fastapi import FastAPI

app = FastAPI(
    title="PropConnect AI",
    description="AI-powered real estate lead management platform",
    version="1.0.0"
)

@app.get("/")
def home():
    return {"message": "Welcome to PropConnect AI"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}