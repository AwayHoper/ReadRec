/** Summary: This function creates a compact unique identifier for the in-memory MVP state. */
export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}