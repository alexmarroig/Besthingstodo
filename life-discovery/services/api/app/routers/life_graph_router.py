from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..life_graph import get_life_graph_for_user
from ..models import User

router = APIRouter(tags=["life-graph"])


@router.get("/life-graph")
def get_life_graph(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_life_graph_for_user(db, user.id)
