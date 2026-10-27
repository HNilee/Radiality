/**
 * Calculates coordinates on a circle given index, total items, and radius.
 * Offset by -PI/2 so the first item starts at the top (12 o'clock).
 */
export function getCoordinates(index: number, total: number, radius: number): { x: number; y: number; angleDeg: number } {
  if (total <= 0) return { x: 0, y: 0, angleDeg: 0 }
  
  const step = (2 * Math.PI) / total
  const angle = index * step - Math.PI / 2
  const x = Math.round(radius * Math.cos(angle) * 100) / 100
  const y = Math.round(radius * Math.sin(angle) * 100) / 100
  const angleDeg = Math.round((angle * 180) / Math.PI)
  
  return { x, y, angleDeg }
}
