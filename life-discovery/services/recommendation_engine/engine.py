from typing import Iterable


def tag_similarity(user_tags: set[str], item_tags: Iterable[str]) -> float:
    item_set = {t.lower() for t in item_tags}
    if not user_tags or not item_set:
        return 0.0
    return len(user_tags & item_set) / len(user_tags | item_set)
