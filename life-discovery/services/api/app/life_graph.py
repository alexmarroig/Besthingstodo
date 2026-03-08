from __future__ import annotations

from collections import defaultdict
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .models import Experience, GraphEdge, GraphNode

SUPPORTED_NODE_TYPES = {
    "person",
    "couple",
    "interest",
    "experience",
    "restaurant",
    "movie",
    "series",
    "travel_destination",
    "event",
    "park",
}

SUPPORTED_EDGE_TYPES = {
    "likes",
    "visited",
    "wants_to_visit",
    "avoids",
    "favorite",
    "related_to",
}


def _normalize(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _experience_node_type(exp: Experience) -> str:
    cat = _normalize(exp.category)
    if exp.domain == "dining_out":
        return "restaurant"
    if exp.domain == "movies_series":
        if cat == "series":
            return "series"
        return "movie"
    if exp.domain == "events_exhibitions":
        return "event"
    if exp.domain == "travel_destination":
        return "travel_destination"
    return "experience"


def _find_node(db: Session, node_type: str, name: str, user_id: str | None = None) -> GraphNode | None:
    q = select(GraphNode).where(GraphNode.type == node_type, GraphNode.name == name)
    rows = db.execute(q).scalars().all()
    if not rows:
        return None
    if user_id is None:
        return rows[0]
    for row in rows:
        meta = row.metadata_json or {}
        if str(meta.get("user_id", "")) == user_id:
            return row
    return rows[0]


def get_or_create_node(db: Session, node_type: str, name: str, metadata: dict | None = None) -> GraphNode:
    if node_type not in SUPPORTED_NODE_TYPES:
        raise ValueError(f"Unsupported node type: {node_type}")

    metadata = metadata or {}
    user_id = str(metadata.get("user_id", "")) if metadata.get("user_id") else None
    found = _find_node(db, node_type=node_type, name=name, user_id=user_id)
    if found:
        merged_meta = dict(found.metadata_json or {})
        merged_meta.update(metadata)
        found.metadata_json = merged_meta
        return found

    row = GraphNode(id=str(uuid4()), type=node_type, name=name, metadata_json=metadata)
    db.add(row)
    db.flush()
    return row


def get_or_create_edge(
    db: Session,
    source_node_id: str,
    target_node_id: str,
    relationship_type: str,
    weight: float = 1.0,
) -> GraphEdge:
    if relationship_type not in SUPPORTED_EDGE_TYPES:
        raise ValueError(f"Unsupported relationship type: {relationship_type}")

    existing = db.execute(
        select(GraphEdge).where(
            GraphEdge.source_node_id == source_node_id,
            GraphEdge.target_node_id == target_node_id,
            GraphEdge.relationship_type == relationship_type,
        )
    ).scalar_one_or_none()

    if existing:
        return existing

    row = GraphEdge(
        id=str(uuid4()),
        source_node_id=source_node_id,
        target_node_id=target_node_id,
        relationship_type=relationship_type,
        weight=weight,
    )
    db.add(row)
    db.flush()
    return row


def _bump_edge_weight(db: Session, source_node_id: str, target_node_id: str, relationship_type: str, delta: float) -> None:
    edge = get_or_create_edge(db, source_node_id, target_node_id, relationship_type, weight=max(0.1, 1.0 + delta))
    edge.weight = max(0.05, float(edge.weight) + delta)

def _ensure_edge_min(db: Session, source_node_id: str, target_node_id: str, relationship_type: str, min_weight: float) -> None:
    edge = get_or_create_edge(db, source_node_id, target_node_id, relationship_type, weight=min_weight)
    if float(edge.weight) < min_weight:
        edge.weight = min_weight

def seed_initial_graph_for_user(db: Session, user_id: str) -> None:
    alex = get_or_create_node(
        db,
        "person",
        "Alex da Cunha Marroig",
        metadata={"user_id": user_id, "member": "alex"},
    )
    camila = get_or_create_node(
        db,
        "person",
        "Camila Veloso de Freitas",
        metadata={"user_id": user_id, "member": "camila"},
    )
    couple = get_or_create_node(
        db,
        "couple",
        "Alex & Camila",
        metadata={"user_id": user_id},
    )

    interests = {
        "psychology": 1.4,
        "astrology": 1.2,
        "cinema": 1.1,
        "art exhibitions": 1.2,
        "mountain travel": 1.1,
    }
    restaurants = ["Lellis Trattoria", "Libertango", "Patties", "Z-Deli", "Issho"]
    destinations = ["Campos do Jordao", "Santo Antonio do Pinhal", "Holambra", "Ibiuna"]
    movies = ["Interestelar", "Parasita", "Os Outros", "Efeito Borboleta"]

    interest_nodes: dict[str, GraphNode] = {}
    for name, w in interests.items():
        node = get_or_create_node(db, "interest", name, metadata={"user_id": user_id})
        interest_nodes[name] = node
        _ensure_edge_min(db, alex.id, node.id, "likes", max(0.1, w / 2))
        _ensure_edge_min(db, camila.id, node.id, "likes", max(0.1, w / 2))
        _ensure_edge_min(db, couple.id, node.id, "favorite", max(0.1, w))

    for restaurant in restaurants:
        node = get_or_create_node(db, "restaurant", restaurant, metadata={"user_id": user_id})
        _ensure_edge_min(db, couple.id, node.id, "favorite", 1.0)
        _ensure_edge_min(db, interest_nodes["cinema"].id, node.id, "related_to", 0.15)

    for destination in destinations:
        node = get_or_create_node(db, "travel_destination", destination, metadata={"user_id": user_id})
        _ensure_edge_min(db, couple.id, node.id, "favorite", 1.0)
        _ensure_edge_min(db, interest_nodes["mountain travel"].id, node.id, "related_to", 0.8)

    for movie in movies:
        node = get_or_create_node(db, "movie", movie, metadata={"user_id": user_id})
        _ensure_edge_min(db, couple.id, node.id, "favorite", 1.0)
        _ensure_edge_min(db, interest_nodes["cinema"].id, node.id, "related_to", 1.0)

    park_node = get_or_create_node(db, "park", "Villa Lobos", metadata={"user_id": user_id})
    _ensure_edge_min(db, couple.id, park_node.id, "likes", 0.9)


def _get_primary_user_nodes(db: Session, user_id: str) -> list[GraphNode]:
    rows = db.execute(select(GraphNode).where(GraphNode.type.in_(["couple", "person"]))).scalars().all()

    matches = []
    for row in rows:
        meta = row.metadata_json or {}
        if str(meta.get("user_id", "")) == user_id:
            matches.append(row)

    if matches:
        return matches

    # fallback by member names
    fallback = [
        row
        for row in rows
        if row.name in {"Alex & Camila", "Alex da Cunha Marroig", "Camila Veloso de Freitas"}
    ]
    return fallback


def find_related_experiences(db: Session, user_id: str, candidate_experiences: list[Experience] | None = None) -> dict[str, float]:
    user_nodes = _get_primary_user_nodes(db, user_id)
    if not user_nodes:
        return {}

    user_node_ids = [n.id for n in user_nodes]

    interest_scores: dict[str, float] = defaultdict(float)
    user_to_interest = db.execute(
        select(GraphEdge).where(
            GraphEdge.source_node_id.in_(user_node_ids),
            GraphEdge.relationship_type.in_(["likes", "favorite"]),
        )
    ).scalars().all()

    if not user_to_interest:
        return {}

    interest_node_ids = [e.target_node_id for e in user_to_interest]
    interest_nodes = db.execute(select(GraphNode).where(GraphNode.id.in_(interest_node_ids))).scalars().all()
    interest_type_ids = {n.id for n in interest_nodes if n.type == "interest"}

    for edge in user_to_interest:
        if edge.target_node_id in interest_type_ids:
            interest_scores[edge.target_node_id] += float(edge.weight)

    if not interest_scores:
        return {}

    graph_scores: dict[str, float] = defaultdict(float)
    interest_to_targets = db.execute(
        select(GraphEdge).where(
            GraphEdge.source_node_id.in_(list(interest_scores.keys())),
            GraphEdge.relationship_type.in_(["related_to", "favorite", "likes", "wants_to_visit"]),
        )
    ).scalars().all()

    for edge in interest_to_targets:
        graph_scores[edge.target_node_id] += interest_scores.get(edge.source_node_id, 0.0) * float(edge.weight)

    if not graph_scores:
        return {}

    target_nodes = db.execute(select(GraphNode).where(GraphNode.id.in_(list(graph_scores.keys())))).scalars().all()
    by_name: dict[str, float] = defaultdict(float)
    for node in target_nodes:
        by_name[_normalize(node.name)] += graph_scores.get(node.id, 0.0)

    if not candidate_experiences:
        return {k: round(v, 4) for k, v in sorted(by_name.items(), key=lambda x: x[1], reverse=True)}

    boosts: dict[str, float] = {}
    for exp in candidate_experiences:
        score = by_name.get(_normalize(exp.title), 0.0)
        for tag in exp.tags or []:
            score += by_name.get(_normalize(str(tag)), 0.0) * 0.2
        boosts[exp.id] = round(score, 4)

    return boosts


def learn_from_feedback(db: Session, user_id: str, exp: Experience, decision: str, reason_tags: list[str], delta: float) -> None:
    seed_initial_graph_for_user(db, user_id)

    couple = get_or_create_node(db, "couple", "Alex & Camila", metadata={"user_id": user_id})
    exp_node = get_or_create_node(
        db,
        _experience_node_type(exp),
        exp.title,
        metadata={"user_id": user_id, "experience_id": exp.id, "domain": exp.domain},
    )

    rel = "likes"
    if decision in {"done", "accepted"}:
        rel = "visited"
    elif decision in {"saved"}:
        rel = "wants_to_visit"
    elif decision in {"rejected", "dislike"}:
        rel = "avoids"

    _bump_edge_weight(db, couple.id, exp_node.id, rel, delta)

    positive = decision in {"accepted", "done", "saved", "like"}
    interest_tags = [str(x).strip().lower() for x in (exp.tags or []) + reason_tags if str(x).strip()]
    if "jung" in _normalize(exp.title):
        interest_tags.extend(["psychology", "exhibitions"])

    for tag in interest_tags:
        interest = get_or_create_node(db, "interest", tag, metadata={"user_id": user_id})
        sign = 1.0 if positive else -1.0
        _bump_edge_weight(db, couple.id, interest.id, "likes", delta * sign)
        _bump_edge_weight(db, interest.id, exp_node.id, "related_to", abs(delta) * 0.7)


def get_life_graph_for_user(db: Session, user_id: str) -> dict:
    seed_initial_graph_for_user(db, user_id)

    user_nodes = _get_primary_user_nodes(db, user_id)
    user_node_ids = {n.id for n in user_nodes}

    edges = db.execute(
        select(GraphEdge).where(
            or_(
                GraphEdge.source_node_id.in_(user_node_ids),
                GraphEdge.target_node_id.in_(user_node_ids),
            )
        )
    ).scalars().all()

    connected_ids = set(user_node_ids)
    for e in edges:
        connected_ids.add(e.source_node_id)
        connected_ids.add(e.target_node_id)

    secondary = db.execute(
        select(GraphEdge).where(
            or_(
                GraphEdge.source_node_id.in_(connected_ids),
                GraphEdge.target_node_id.in_(connected_ids),
            )
        )
    ).scalars().all()

    all_edges = {e.id: e for e in edges}
    for e in secondary:
        all_edges[e.id] = e
        connected_ids.add(e.source_node_id)
        connected_ids.add(e.target_node_id)

    nodes = db.execute(select(GraphNode).where(GraphNode.id.in_(connected_ids))).scalars().all()

    return {
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "name": n.name,
                "metadata_json": n.metadata_json or {},
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source_node_id": e.source_node_id,
                "target_node_id": e.target_node_id,
                "relationship_type": e.relationship_type,
                "weight": e.weight,
            }
            for e in all_edges.values()
        ],
    }




