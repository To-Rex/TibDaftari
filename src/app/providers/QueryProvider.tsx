/**
 * TanStack Query client with a persisted, whitelisted cache.
 *
 *  - Reference-ish data (catalog, templates, branches, company, roles, regions, schemas, assets)
 *    is persisted to localStorage so pages paint instantly after a reload and refresh in the
 *    background (stale-while-revalidate). Patient / order / message data is intentionally NOT
 *    persisted (memory only) — it never sits in browser storage.
 *  - Longer staleTime keeps navigation instant inside a session; mutations invalidate explicitly.
 */
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState, type ReactNode } from 'react'

const PERSIST_KEY = 'clinic.query.cache.v1'
const DAY = 24 * 60 * 60 * 1000

/** Query-key prefixes that are safe and worth persisting (no personal data). */
const PERSISTED_PREFIXES = new Set(['categories', 'service-types', 'serviceTypes', 'schemas', 'schema', 'templates', 'template', 'templateAssets', 'template-assets', 'branches', 'company', 'companies', 'roles', 'regions', 'districts'])

const isPersistable = (key: readonly unknown[]) => typeof key[0] === 'string' && PERSISTED_PREFIXES.has(key[0])

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: DAY,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: { retry: 0 },
        },
      }),
  )
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: PERSIST_KEY,
      throttleTime: 1000,
    }),
  )
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: DAY,
        buster: 'v1',
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' && isPersistable(q.queryKey) },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
