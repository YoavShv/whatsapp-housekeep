import type { ComplaintCategory, Urgency } from '@/lib/db/schema'

export const CATEGORY_HE: Record<ComplaintCategory, string> = {
  plumbing: 'אינסטלציה',
  electrical: 'חשמל',
  elevator: 'מעלית',
  cleaning: 'ניקיון',
  noise: 'רעש',
  parking: 'חנייה',
  other: 'אחר',
}

export const URGENCY_HE: Record<Urgency, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
}

export function categoryLabel(c: ComplaintCategory): string {
  return CATEGORY_HE[c]
}

export function urgencyLabel(u: Urgency): string {
  return URGENCY_HE[u]
}
