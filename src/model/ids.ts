export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function lpName(prefix: string, index: number): string {
  return `${prefix}${index}`;
}
