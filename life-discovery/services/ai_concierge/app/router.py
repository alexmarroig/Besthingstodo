from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .agent import run_agent
from .db import get_db
from .schemas import ConciergeChatIn, ConciergeChatOut

router = APIRouter(prefix="/concierge", tags=["ai-concierge"])


@router.post("/chat", response_model=ConciergeChatOut)
def chat(payload: ConciergeChatIn, db: Session = Depends(get_db)):
    result = run_agent(payload.user_id, payload.message, db)
    return ConciergeChatOut(**result)
