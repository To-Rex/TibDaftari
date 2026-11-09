/**
 * HTTP PortalRepository — patient self-service surface (patient bearer token).
 * Wire contract: TibDaftari-Backend `app/modules/portal` (router.py / schemas.py).
 *  - `patientId` arguments are ignored: the backend scopes everything to the token's patient.
 *  - `ResultDocument.pdfUrl` comes back relative (`/api/v1/portal/documents/{id}/pdf`) and is absolutised here,
 *    as are `TemplateAsset.url` and the organisation `logoUrl` (`/api/v1/files/{id}`, public route).
 */
import type { ResultDocument, TemplateAsset } from '@/domain'
import type { PortalOrg, PortalRepository } from '@/data/repositories'
import { absoluteUrl, api } from './client'

type Overview = Awaited<ReturnType<PortalRepository['overview']>>
type PortalOrder = Awaited<ReturnType<PortalRepository['order']>>
type PortalDocument = Awaited<ReturnType<PortalRepository['document']>>

const withPdfUrl = (d: ResultDocument): ResultDocument => ({ ...d, pdfUrl: absoluteUrl(d.pdfUrl) })
const withAssetUrl = (a: TemplateAsset): TemplateAsset => ({ ...a, url: absoluteUrl(a.url) ?? a.url })
const withLogo = (o: PortalOrg): PortalOrg => ({ ...o, logoUrl: absoluteUrl(o.logoUrl) })

const asPatient = { actor: 'patient' } as const

export const portalHttp: PortalRepository = {
  overview: async () => {
    const r = await api.get<Overview>('/portal/overview', asPatient)
    return { ...r, documents: r.documents.map(withPdfUrl), orgs: r.orgs.map(withLogo) }
  },

  order: async (_patientId, orderId) => {
    const r = await api.get<PortalOrder>(`/portal/orders/${orderId}`, asPatient)
    return { ...r, documents: r.documents.map(withPdfUrl), org: withLogo(r.org) }
  },

  document: async (_patientId, documentId) => {
    const r = await api.get<PortalDocument>(`/portal/documents/${documentId}`, asPatient)
    return { ...r, document: withPdfUrl(r.document), assets: r.assets.map(withAssetUrl), org: withLogo(r.org) }
  },
}
