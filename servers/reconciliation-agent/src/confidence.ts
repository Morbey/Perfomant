/**
 * Confidence utilities used by the reconciliation pipeline.
 * All confidence values are clamped to the range [0, 1].
 */

export function clampConfidence(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

/**
 * Combine a base confidence with a delta, then clamp.
 */
export function applyDelta(base: number, delta: number): number {
    return clampConfidence(base + delta);
}