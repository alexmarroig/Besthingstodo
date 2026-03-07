import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    den = np.linalg.norm(va) * np.linalg.norm(vb)
    if den == 0:
        return 0.0
    return float(np.dot(va, vb) / den)
