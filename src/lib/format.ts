/** Format angka menjadi Rupiah: 150000 → "Rp150.000" */
export function formatRupiah(n: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(Math.round(n))}`
}

/** Format singkat untuk chart/summar: 150000 → "150rb", 1250000 → "1,25jt" */
export function formatRupiahShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${trimZero(abs / 1_000_000_000)}M`
  if (abs >= 1_000_000) return `${sign}${trimZero(abs / 1_000_000)}jt`
  if (abs >= 1_000) return `${sign}${trimZero(abs / 1_000)}rb`
  return `${sign}${Math.round(abs)}`
}

function trimZero(v: number): string {
  const s = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v)
  return s
}

/** Ambil angka murni: 150000 → "150.000" */
export function formatNumberID(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

/** Ubah string digit menjadi rupiah (tanpa "Rp"): "15000" → "15.000" */
export function groupDigits(digits: string): string {
  if (!digits) return '0'
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}
