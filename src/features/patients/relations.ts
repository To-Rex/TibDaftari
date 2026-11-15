/**
 * One phone, a whole family: the relation keys, their labels (gender-aware — o‘g‘li / qizi, eri / xotini …) and the
 * "Aziza Karimovaning o‘g‘li" phrase. The labels live under `relation.*` in the main locales (staff app and portal).
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RELATIONS, type Gender, type Relation } from '@/domain'

/** the relations a person of this gender can be (siblings and parents are gendered words; the rest fit anyone) */
export function relationsFor(gender?: Gender | '' | null): Relation[] {
  if (gender === 'male') return RELATIONS.filter((r) => r !== 'mother' && r !== 'sister_older' && r !== 'sister_younger')
  if (gender === 'female') return RELATIONS.filter((r) => r !== 'father' && r !== 'brother_older' && r !== 'brother_younger')
  return [...RELATIONS]
}

export function useRelationLabels() {
  const { t, i18n } = useTranslation()
  /** "O‘g‘li" for a boy, "Qizi" for a girl, "Farzandi" when the gender is unknown */
  const label = useCallback((rel: Relation, gender?: Gender | '' | null) => {
    const generic = t(`relation.${rel}`)
    return gender ? t(`relation.${rel}_${gender}`, { defaultValue: generic }) : generic
  }, [t])
  /** "Aziza Karimovaning o‘g‘li" / "Сын · Азиза Каримова" / "Son of Aziza Karimova" */
  const of = useCallback((rel: Relation, gender: Gender | '' | null | undefined, name: string) => {
    const word = label(rel, gender)
    const lower = !i18n.language?.startsWith('ru')
    return t('relation.of', { rel: lower ? word.toLocaleLowerCase(i18n.language) : word, name })
  }, [label, t, i18n.language])
  return { label, of }
}
