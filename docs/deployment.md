# PropConnect AI — Deployment Guide

## 1. Overview

PropConnect AI is a full-stack real estate lead management and site-visit booking application.

The application consists of:

- React frontend built using Vite.
- FastAPI backend built using Python.
- PostgreSQL database.
- Groq API for AI-powered question answering.

The application is deployed using Render.

## 2. Live Deployment

| Component | URL |
|---|---|
| Frontend | https://propconnect-ai-1.onrender.com |
| Backend | https://propconnect-ai-c5mz.onrender.com |
| API Documentation | https://propconnect-ai-c5mz.onrender.com/docs |

## 3. Prerequisites

Install the following before running the application locally:

- Python 3
- Node.js and npm
- PostgreSQL
- Git
- Groq API key

## 4. Clone the Repository

```bash
git clone https://github.com/prarthuhs97-stack/PropConnect-AI.git
cd PropConnect-AI
```

## 5. Backend Setup

### 5.1 Create a Virtual Environment

```bash
cd backend

python3 -m venv venv
source venv/bin/activate
```

### 5.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 5.3 Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```env
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@localhost:5432/propconnect_db
SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:5173
```

Replace the placeholder values with your actual local database credentials, a secure secret key, and your Groq API key.

Never commit `.env` files or expose secret values in public repositories.

### 5.4 Create the Database

Create a PostgreSQL database named:

`propconnect_db`

Ensure PostgreSQL is running and the database connection details match the `DATABASE_URL` configuration.

### 5.5 Start the Backend

From the `backend` directory, run:

```bash
uvicorn main:app --reload
```

The backend will be available at:

`http://localhost:8000`

Swagger API documentation:

`http://localhost:8000/docs`

## 6. Frontend Setup

Open another terminal from the project root.

### 6.1 Install Dependencies

```bash
cd frontend
npm install
```

### 6.2 Configure Environment Variables

Create a `.env` file inside the `frontend` directory.

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
```

These variables configure the frontend to communicate with the local backend.

### 6.3 Start the Frontend

```bash
npm run dev
```

The frontend will be available at:

`http://localhost:5173`

## 7. Production Deployment on Render

The production application uses three Render services.

### 7.1 PostgreSQL Database

Create a PostgreSQL database through the Render Dashboard.

Configure the database name, username, region, and available plan.

Copy the Internal Database URL from the database's Connections section. Use this URL in the backend environment configuration.

The database and backend should be deployed in the same Render region to enable private network communication.

### 7.2 Backend Deployment

Create a Render Web Service connected to the GitHub repository.

Repository:

`https://github.com/prarthuhs97-stack/PropConnect-AI`

Configure the service:

| Setting | Value |
|---|---|
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Python |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Configure the following environment variables in Render:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Render PostgreSQL Internal Database URL |
| `SECRET_KEY` | Secure generated secret |
| `GROQ_API_KEY` | Groq API key |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `FRONTEND_URL` | `https://propconnect-ai-1.onrender.com` |

Do not store secrets