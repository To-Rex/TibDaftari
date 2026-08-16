import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button, EmptyState } from '@/shared/ui'
import { routes } from '@/shared/config/routes'

export function RouteError() {
  const err = useRouteError()
  const msg = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unknown error'
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <EmptyState icon={<AlertTriangle />} title="Xatolik yuz berdi" description={msg}
        action={<Link to={routes.home}><Button variant="secondary">Bosh sahifa</Button></Link>} />
    </div>
  )
}
