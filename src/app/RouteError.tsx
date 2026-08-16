import { useEffect } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button, EmptyState } from '@/shared/ui'
import { routes } from '@/shared/config/routes'

export function RouteError() {
  const err = useRouteError()
  const msg = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unknown error'
  const chunkError = /dynamically imported module|Importing a module script failed/i.test(msg)
  useEffect(() => {
    if (!chunkError) return
    const KEY = 'clinic.chunk-reload'
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last > 10_000) { sessionStorage.setItem(KEY, String(Date.now())); window.location.reload() }
  }, [chunkError])
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <EmptyState icon={<AlertTriangle />} title="Xatolik yuz berdi" description={msg}
        action={<div className="flex gap-2"><Button onClick={() => window.location.reload()}>Qayta yuklash</Button><Link to={routes.home}><Button variant="secondary">Bosh sahifa</Button></Link></div>} />
    </div>
  )
}
