import type { Category, Id } from '@/domain'

export interface CategoryNode {
  cat: Category
  children: CategoryNode[]
  depth: number
}

/** Build a nested tree from the flat category list (sorted by `order`). */
export function buildCategoryTree(list: Category[]): CategoryNode[] {
  const byParent = new Map<Id | null, Category[]>()
  for (const c of list) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const build = (parentId: Id | null, depth: number): CategoryNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.order - b.order)
      .map((cat) => ({ cat, depth, children: build(cat.id, depth + 1) }))
  return build(null, 0)
}

/** ids of a category and all its descendants */
export function descendantIds(list: Category[], rootId: Id): Set<Id> {
  const ids = new Set<Id>([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const c of list) if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); grew = true }
  }
  return ids
}

/** breadcrumb path root → node */
export function categoryPath(list: Category[], id: Id | null): Category[] {
  const out: Category[] = []
  let cur = list.find((c) => c.id === id)
  while (cur) { out.unshift(cur); cur = list.find((c) => c.id === cur!.parentId) }
  return out
}

/** flatten tree to display rows honoring expanded set */
export function flattenTree(nodes: CategoryNode[], expanded: Set<Id>): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (ns: CategoryNode[]) => {
    for (const n of ns) { out.push(n); if (expanded.has(n.cat.id)) walk(n.children) }
  }
  walk(nodes)
  return out
}
