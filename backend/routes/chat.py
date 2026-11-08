from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.project import ProjectFact
from schemas.chat import ChatRequest

router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.post("/ask")
def ask_question(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    facts = db.query(ProjectFact).filter(
        ProjectFact.project_id == request.project_id,
        ProjectFact.is_approved == True
    ).all()

    question_words = set(request.question.lower().split())

    stop_words = {
        "what", "is", "are", "the", "a", "an",
        "of", "in", "for", "to", "do", "does",
        "can", "i", "and", "how", "much"
    }

    question_words = {
        word.strip("?,.!") for word in question_words
        if word.strip("?,.!") not in stop_words
    }

    best_fact = None
    best_score = 0

    for fact in facts:
        fact_words = set(
            (fact.question + " " + fact.category).lower().split()
        )

        fact_words = {
            word.strip("?,.!") for word in fact_words
        }

        score = len(question_words & fact_words)

        if score > best_score:
            best_score = score
            best_fact = fact

    if best_fact is None:
        return {
            "answer": "I don't have verified information about that. Please contact our sales team for assistance.",
            "grounded": False,
            "source_fact_id": None
        }

    return {
        "answer": best_fact.answer,
        "grounded": True,
        "source_fact_id": best_fact.id
    }