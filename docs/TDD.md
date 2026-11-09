# Technical Design Document (TDD)

## PropConnect AI
**AI-Powered Real Estate Lead Management and Site-Visit Booking Platform**

**Version:** 1.0.0
**Status:** Implemented and deployed

---

## 1. Introduction

### 1.1 Purpose

PropConnect AI is designed to simplify real estate lead management and improve communication between property developers and potential buyers.

The platform provides an AI-powered assistant that answers property-related questions using approved project information. It also supports buyer authentication, lead capture, lead assignment, and site-visit booking.

### 1.2 Problem Statement

Real estate developers often receive enquiries through multiple channels, making it difficult to track leads and respond consistently.

Manual follow-ups can result in:
- Delayed responses to potential buyers.
- Missed or untracked enquiries.
- Difficulty managing buyer requirements.
- Inefficient site-visit scheduling.
- Inconsistent property information.

### 1.3 Proposed Solution

PropConnect AI provides a centralized platform where:

- Buyers can register and explore property projects.
- An AI assistant answers questions using approved project facts.
- Buyer requirements can be captured as leads.
- Leads can be assigned to salespeople.
- Buyers can view available site-visit slots and book visits.
- Administrators can manage projects and approve project information.

---

## 2. System Architecture

### 2.1 Architecture Overview

The application follows a client-server architecture.

The React frontend communicates with the FastAPI backend through REST APIs. The backend handles authentication, business logic, database operations, and AI integration.

PostgreSQL stores application data, while the Groq API provides language-model capabilities.

### 2.2 Architecture Diagram

```text
             BUYER / SALESPERSON / ADMIN
                         |
                         v
                React Frontend
                    (Vite)
                         |
                    REST APIs
                         |
                         v
                 FastAPI Backend
                  /     |      \
                 /      |       \
                v       v        v
          PostgreSQL  Groq API  Authentication
          Database    (LLM)       (JWT)
                |
                v
       Projects, Users, Leads,
       Approved Facts and Visits
```

### 2.3 Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, CSS |
| Build Tool | Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI Integration | Groq API |
| Authentication | JWT |
| API Documentation | Swagger UI |
| Testing | Pytest |
| Deployment | Render |

---

## 3. Application Modules

### 3.1 Authentication Module

The application supports user registration and login.

- Users register as buyers by default.
- Login credentials are verified by the backend.
- JWT tokens are used for authenticated requests.
- Role-based access controls access to protected operations.

Supported roles:
- Buyer
- Salesperson
- Admin

### 3.2 Project Management Module

This module manages real estate project information.

Administrators can create and manage projects. Project information is stored in PostgreSQL and made available to the frontend.

### 3.3 Project Facts Management Module

Project facts contain approved information about properties.

Examples include:
- Property configurations.
- Pricing information.
- Amenities.
- Location details.
- Project specifications.

Facts are submitted and require approval before they can be used by the AI assistant.

This approval mechanism helps prevent the assistant from using unverified project information.

### 3.4 AI Chatbot Module

The AI assistant helps buyers obtain information about real estate projects.

**Processing workflow:**

1. The buyer submits a question.
2. The frontend sends the question to the FastAPI backend.
3. The backend retrieves relevant approved project facts.
4. The retrieved information is provided to the Groq language model.
5. The model generates a structured response.
6. The backend validates the response before returning it.
7. If the required information is unavailable, the assistant abstains rather than inventing an answer.

**Key design decisions:**

- Only approved project facts are used as the information source.
- Unsupported claims should not be presented as confirmed facts.
- Responses are validated before being returned.
- Technical failures are handled separately from valid abstentions.
- The application does not treat an AI-generated response as a substitute for verified project information.

### 3.5 Lead Management Module

This module captures and manages potential buyers.

The buyer can provide requirements such as:
- Preferred property configuration.
- Budget.
- Purchase timeline.

The submitted information is stored as a lead.

The application supports lead assignment and status tracking by salespeople.

Lead handoff is based on buyer consent.

### 3.6 Site-Visit Booking Module

The site-visit module manages available visit slots and buyer bookings.

Workflow:

1. An authorized user creates a visit slot.
2. The slot is stored in the database.
3. Buyers can view active available slots.
4. A buyer selects and books a slot.
5. The backend checks slot availability before confirming the booking.

Database constraints and backend validation help prevent duplicate bookings.

Site visits are booked through the dedicated site-visit functionality rather than directly through the chatbot.

### 3.7 Admin Module

The admin module supports administrative operations such as project management, project-fact approval, and lead assignment.

Some administrative operations are accessed through the backend API documentation.

---

## 4. Database Design

PostgreSQL is used as the application's relational database.

SQLAlchemy is used for database interaction through ORM models.

### 4.1 Main Database Entities

| Entity | Purpose |
|---|---|
| Users | Stores user accounts and roles |
| Projects | Stores real estate project information |
| Project Facts | Stores project information and approval status |
| Leads | Stores buyer requirements and lead status |
| Visit Slots | Stores available site-visit slots |
| Site Visits | Stores buyer bookings |

### 4.2 Entity Relationships

- A project can have multiple project facts.
- A project can have multiple leads.
- A project can have multiple visit slots.
- A buyer can submit leads.
- A buyer can book site visits.
- A visit slot can be associated with site-visit bookings.

### 4.3 Data Integrity

The backend uses database relationships, validation, and constraints to maintain data consistency.

Booking operations check slot availability to prevent duplicate reservations.

---

## 5. API Design

The backend exposes REST API endpoints through FastAPI.

| Module | Endpoint | Purpose |
|---|---|---|
| Authentication | `/auth/` | User registration and login |
| Projects | `/projects/` | Project operations |
| Facts | `/facts/` | Project fact management and approval |
| Chat | `/chat/ask` | AI question answering |
| Leads | `/leads/` | Lead creation and management |
| Visits | `/visits/` | Site-visit slots and bookings |
| Admin | `/admin/` | Administrative operations |

The exact HTTP methods and request schemas are documented through the FastAPI Swagger interface.

**API Documentation:**
https://propconnect-ai-c5mz.onrender.com/docs

---

## 6. AI Integration and Reliability

### 6.1 Language Model Integration

The application integrates with the Groq API using an OpenAI-compatible chat-completions interface.

The configured model is:

`openai/gpt-oss-20b`

The backend sends the buyer's question along with approved project information to the language model.

### 6.2 Grounded Answering

The assistant is designed to answer using the approved facts supplied by the backend.

When sufficient information is unavailable, it should communicate that limitation instead of generating an unsupported property claim.

### 6.3 Error Handling

The application distinguishes between:

- Valid answers.
- Valid abstentions due to missing information.
- Technical failures such as API errors, connection failures, and timeouts.

Transient API failures are handled using retry logic where configured.

### 6.4 Security Considerations

- API keys and secrets are stored in environment variables.
- JWT authentication protects authenticated operations.
- Role-based authorization restricts administrative operations.
- Only approved project facts are supplied as the chatbot's knowledge source.
- User input is validated by backend schemas.

---

## 7. Testing Strategy

Backend functionality is tested using Pytest.

The test suite includes chatbot response handling and failure scenarios.

Testing also covers application-level validation and API behaviour.

Frontend production compilation is verified using:

```bash
npm run build
```

Backend tests are executed using:

```bash
python3 -m pytest -v
```

**Verified development results:** 55 backend tests passed, and the frontend production build completed successfully.

---

## 8. Deployment Architecture

The application is deployed using Render.

| Component | Deployment |
|---|---|
| Frontend | Render Static Site |
| Backend | Render Web Service |
| Database | Render PostgreSQL |
| AI Provider | Groq API |

The frontend communicates with the backend through its public HTTPS URL.

The backend connects to PostgreSQL using its configured database connection string.

Production secrets are configured through Render environment variables rather than committed to GitHub.

### Live Application

- Frontend: https://propconnect-ai-1.onrender.com
- Backend: https://propconnect-ai-c5mz.onrender.com
- Swagger API: https://propconnect-ai-c5mz.onrender.com/docs

---

## 9. Current Limitations

- The chatbot does not directly retrieve live site-visit slots or book visits.
- Admin and salesperson role assignment requires database-level setup.
- The frontend does not currently maintain conversational history across chat requests.
- Some administrative workflows are performed through Swagger rather than dedicated frontend screens.
- Production availability depends on the hosting plan and external API availability.

---

## 10. Future Enhancements

Potential future improvements include:

- Conversational memory across chatbot interactions.
- Direct chatbot integration with site-visit availability.
- More complete administrative dashboards.
- Automated lead prioritization.
- Expanded automated testing.
- Monitoring and production logging improvements.

---

## 11. Conclusion

PropConnect AI combines real estate lead management, approved-information-based AI question answering, and site-visit booking in one platform.

The system uses a React frontend, FastAPI backend, PostgreSQL database, and Groq language-model integration.

The design emphasizes structured data management, controlled AI responses, authentication, and a practical workflow for buyers, salespeople, and administrators.
**## Project Repository**

GitHub: https://github.com/prarthuhs97-stack/PropConnect-AI

**Live Application:** https://propconnect-ai-1.onrender.com

**Backend API:** https://propconnect-ai-c5mz.onrender.com

**API Documentation:** https://propconnect-ai-c5mz.onrender.com/docs