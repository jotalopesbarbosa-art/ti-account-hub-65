// src/lib/id.ts
export function generateId(): string {
  // 1) Preferido: randomUUID (quando existe)
  try {
    const c: any = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {}

  // 2) Fallback: UUID v4 via getRandomValues (bem suportado)
  try {
    const c: any = globalThis.crypto;
    if (c?.getRandomValues) {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);

      // UUID v4 bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {}

  // 3) Último fallback: tempo + random (não cripto, mas evita crash)
  return `bill_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
