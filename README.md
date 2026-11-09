# PropConnect AI

**AI-Powered Real Estate Lead Management and Site-Visit Booking Platform**

PropConnect AI is a real estate platform designed to help property developers manage buyer enquiries, answer project-related questions using approved information, capture potential leads, and organize site visits.

## Features

- **AI Real Estate Assistant:** Answers buyer questions using approved project information.
- **Grounded Responses:** Uses approved project facts and avoids making unsupported claims.
- **Buyer Authentication:** Supports buyer registration and login.
- **Lead Management:** Captures buyer requirements and supports lead assignment and status tracking.
- **Site-Visit Booking:** Allows buyers to view available slots and book visits.
- **Role-Based Access:** Supports buyer, salesperson, and admin roles.
- **Project Management:** Supports project creation and management.
- **Fact Approval:** Allows project information to be submitted and approved before being used by the AI assistant.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI Integration | Groq API |
| Authentication | JWT |
| API Testing | FastAPI Swagger UI, Pytest |

## Project Structure

```text
PropConnect-AI/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── tests/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── security.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│   ├── TDD.md
│   └── deployment.md
│
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3
- Node.js and npm
- PostgreSQL
- Groq API key

### 1. Clone the repository

```bash
git clone https://github.com/prarthuhs97-stack/PropConnect-AI.git
cd PropConnect-AI
```

### 2. Set up the backend

```bash
cd backend

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Create a PostgreSQL database named `propconnect_db`.

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@localhost:5432/propconnect_db
SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Replace the placeholder values with your own credentials.

Start the backend:

```bash
uvicorn main:app --reload
```

Backend: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

## Running Tests

From the backend directory, with the virtual environment activated:

```bash
python3 -m pytest -v
```

To build the frontend:

```bash
cd frontend
npm run build
```

## AI Assistant Workflow

1. The buyer asks a property-related question.
2. The backend retrieves approved project information.
3. The information is provided to the Groq-powered language model.
4. The response is checked against the available approved facts.
5. If the information is unavailable, the assistant avoids inventing an answer.

## Current Scope and Limitations

- The chatbot uses approved project information and does not independently guarantee property availability.
- Site visits are booked through the dedicated site-visit functionality, not directly through the chatbot.
- Admin and salesperson role assignment requires database-level setup.
- The application requires environment configuration before running.
- Production deployment configuration is maintained separately in `docs/deployment.md`.

## Documentation

- [Technical Design Document](docs/TDD.md)
- [Deployment Guide](docs/deployment.md)

## Author

**Prarthana H S**

GitHub: [@prarthuhs97-stack](https://github.com/prarthuhs97-stack)
