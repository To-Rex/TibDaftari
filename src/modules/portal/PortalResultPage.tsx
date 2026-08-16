import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowLeft, BadgeCheck, Download, FileQuestion, Printer } from 'lucide-react'
import { usePatientSession } from '@/features/session/useSession'
import {
  useBranches,
  useCompany,
  usePatient,
  usePortalDocument,
  useSchema,
  useTemplateAssets,
} from '@/features/portal/queries'
import { documentTitle } from '@/features/portal/status'
import { DocumentViewer } from '@/features/portal/components/DocumentViewer'
import { ResultInfoPanel } from '@/features/portal/components/ResultInfoPanel'
import { buildRenderContext } from '@/features/documents/buildContext'
import { routes } from '@/shared/config/routes'
import { fmtDate } from '@/shared/lib/format'
import { Badge, Button, Card, EmptyState, Page, Skeleton, toast } from '@/shared/ui'

export default function PortalResultPage() {
  const { t } = useTranslation()
  const { documentId } = useParams<{ documentId: string }>()
  const session = usePatientSession()

  const q = usePortalDocument(session.patientId, documentId)
  const companyId = q.data?.document.companyId
  const patientQ = usePatient(session.patientId)
  const companyQ = useCompany(companyId)
  const branchesQ = useBranches(companyId)
  const assetsQ = useTemplateAssets(companyId)
  const schemaQ = useSchema(q.data?.item?.schemaId)

  const branch = branchesQ.data?.find((b) => b.id === q.data?.order.branchId)
  const ready =
    !!q.data &&
    patientQ.isSuccess &&
    companyQ.isSuccess &&
    branchesQ.isSuccess &&
    assetsQ.isSuccess &&
    (!q.data.item?.schemaId || schemaQ.isSuccess)

  const ctx = useMemo(
    () =>
      q.data
        ? buildRenderContext({
            patient: patientQ.data,
            order: q.data.order,
            item: q.data.item,
            company: companyQ.data,
            branch,
            schema: schemaQ.data ?? null,
            // order-scoped documents (several services on one sheet)
            items: q.data.template.scope === 'order'
              ? q.data.items.map((item) => ({ item, schema: q.data!.schemas.find((s) => s.id === item.schemaId) ?? null, code: q.data!.serviceCodes[item.serviceTypeId] ?? item.serviceTypeId }))
              : undefined,
          })
        : null,
    [q.data, patientQ.data, companyQ.data, branch, schemaQ.data],
  )

  const print = () => window.print()
  const download = () => {
    toast.info(t('portal.result.download'), t('portal.result.downloadHint'))
    setTimeout(print, 350)
  }

  if (q.isError) {
    return (
      <Page width="medium">
        <Card padded={false}>
          <EmptyState
            icon={<FileQuestion />}
            title={t('portal.result.notFoundTitle')}
            description={t('portal.result.notFoundText')}
            action={
              <Link to={routes.portal.results}>
                <Button variant="secondary" leftIcon={<ArrowLeft className="size-4" />}>
                  {t('portal.result.backToResults')}
                </Button>
              </Link>
            }
          />
        </Card>
      </Page>
    )
  }

  const doc = q.data?.document
  const title = doc ? documentTitle(doc) : ''

  return (
    <Page width="medium" className="2xl:max-w-6xl 3xl:max-w-[1600px]">
      <Link
        to={routes.portal.results}
        className="text-ink-3 hover:text-ink mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" /> {t('portal.result.backToResults')}
      </Link>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {doc ? (
            <>
              <p className="text-ink-3 text-[12.5px]">
                {companyQ.data?.name}
                {branch && <> · {branch.name}</>}
                {' · '}
                <span className="tabular">{fmtDate(doc.createdAt)}</span>
              </p>
              <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight break-words xs:text-[22px] sm:text-[26px]">
                {title}
              </h1>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-2"
              >
                <Badge tone="ok" className="h-7 px-3 text-[12.5px]">
                  <BadgeCheck className="size-3.5" /> {t('portal.result.approved')}
                </Badge>
              </motion.div>
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-7 w-72" />
              <Skeleton className="h-6 w-44 rounded-full" />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 max-xs:[&>button]:flex-1">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="size-4" />}
            onClick={print}
            disabled={!ready}
          >
            {t('portal.result.print')}
          </Button>
          <Button
            size="sm"
            leftIcon={<Download className="size-4" />}
            onClick={download}
            disabled={!ready}
          >
            {t('portal.result.download')}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-8">
        <div className="min-w-0">
          {ready && ctx && q.data ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <DocumentViewer doc={q.data.template.doc} ctx={ctx} assets={assetsQ.data ?? []} />
            </motion.div>
          ) : (
            <Skeleton className="mx-auto aspect-[794/1123] w-full max-w-[794px] rounded-[10px]" />
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-20">
          {ready && ctx && q.data ? (
            <ResultInfoPanel
              item={q.data.item}
              order={q.data.order}
              ctx={ctx}
              clinic={companyQ.data?.name}
              branch={branch?.name}
            />
          ) : (
            <Card>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-3.5" />
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </Page>
  )
}
