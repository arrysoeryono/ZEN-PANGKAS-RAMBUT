/** Validasi ringan di sisi client (mirror dari aturan server) */
export function validatePinClient(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return 'PIN harus 4-6 digit angka'
  return null
}
