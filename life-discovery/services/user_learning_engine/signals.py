from __future__ import annotations

import math
from datetime import datetime, timezone

INTERACTION_SIGNAL_MAP = {
    "view": 0.1,
    "click": 0.2,
    "save": 0.5,
    "like": 1.0,
    "dislike": -1.0,
}


def convert_interaction_to_signal(interaction_type: str) -> float:
    return INTERACTION_SIGNAL_MAP.get((interaction_type or "").lower().strip(), 0.0)


def apply_time_decay(signal_weight: float, event_time: datetime, lambda_decay: float = 0.05) -> float:
    now = datetime.now(timezone.utc)
    ts = event_time if event_time.tzinfo else event_time.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (now - ts).total_seconds() / 3600.0)
    return signal_weight * math.exp(-lambda_decay * age_hours)
