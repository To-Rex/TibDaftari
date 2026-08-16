/** Builds a RenderContext from domain objects (mirror of the backend context builder). */
import type { AttributeSchema, Branch, Company, Order, OrderItem, Patient, RenderContext } from '@/domain'
import { ageFrom, ageMonthsFrom, fmtDate, fmtDateTime, fmtPhone } from '@/shared/lib/format'
import i18n from '@/shared/i18n'

export function buildRenderContext(input: {
  patient?: Pick<Patient, 'fullName' | 'phone' | 'birthDate' | 'gender' | 'address' | 'passportNumber'> | null
  order?: Pick<Order, 'number' | 'createdAt'> | null
  item?: Pick<OrderItem, 'serviceName' | 'approvedAt' | 'technicianName' | 'doctorName' | 'labNote' | 'values'> | null
  company?: Pick<Company, 'name' | 'phone' | 'address'> | null
  branch?: Pick<Branch, 'name' | 'address'> | null
  schema?: AttributeSchema | null
  districtName?: string
}): RenderContext {
  const p = input.patient
  const address = [input.districtName, p?.address?.street].filter(Boolean).join(', ')
  return {
    patient: {
      fullName: p?.fullName ?? '',
      phone: fmtPhone(p?.phone),
      birthDate: fmtDate(p?.birthDate),
      age: p?.birthDate ? String(ageFrom(p.birthDate)) : '',
      gender: p?.gender ? i18n.t(`common.${p.gender}`) : '',
      genderRaw: p?.gender,
      ageMonths: ageMonthsFrom(p?.birthDate),
      address,
      passportNumber: p?.passportNumber ?? '',
    },
    order: { number: input.order?.number ?? '', date: fmtDate(input.order?.createdAt) },
    item: {
      serviceName: input.item?.serviceName ?? '',
      approvedAt: input.item?.approvedAt ? fmtDateTime(input.item.approvedAt) : '',
      technician: input.item?.technicianName ?? '',
      doctor: input.item?.doctorName ?? '',
      labNote: input.item?.labNote ?? '',
    },
    company: { name: input.company?.name ?? '', phone: input.company?.phone, address: input.company?.address },
    branch: { name: input.branch?.name ?? '', address: input.branch?.address },
    today: fmtDate(new Date().toISOString()),
    values: input.item?.values ?? {},
    schema: input.schema ?? null,
  }
}

/** Sample context for editor previews when no real item is selected. */
export function sampleRenderContext(schema: AttributeSchema | null, company?: Pick<Company, 'name' | 'phone' | 'address'> | null, branch?: Pick<Branch, 'name' | 'address'> | null): RenderContext {
  const values: RenderContext['values'] = {}
  for (const f of schema?.fields ?? []) {
    switch (f.type) {
      case 'text': values[f.key] = 'Namuna matn'; break
      case 'longtext': values[f.key] = 'Izoh matni. Qayta tahlil 30 kundan so‘ng tavsiya etiladi.'; break
      case 'number': { const r = f.references[0]; values[f.key] = r?.min != null && r?.max != null ? Number(((r.min + r.max) / 2).toFixed(f.decimals ?? 1)) : 12.5; break }
      case 'select': values[f.key] = f.options[0]?.value ?? null; break
      case 'multiselect': values[f.key] = f.options.slice(0, 2).map((o) => o.value); break
      case 'boolean': values[f.key] = true; break
      case 'date': values[f.key] = new Date().toISOString().slice(0, 10); break
      case 'table': {
        const rows = f.presetRows.length ? f.presetRows.slice(0, 8) : Array.from({ length: 4 }, () => ({}))
        values[f.key] = rows.map((r, i) => {
          const o: Record<string, unknown> = { ...r }
          for (const c of f.columns) if (o[c.key] == null || o[c.key] === '') o[c.key] = c.type === 'select' ? (c.options[i % c.options.length]?.value ?? '') : c.type === 'number' ? 10 + i : c.type === 'boolean' ? i % 2 === 0 : c.type === 'multiselect' ? c.options.slice(0, 1).map((x) => x.value) : `Namuna ${i + 1}`
          return o
        })
        break
      }
    }
  }
  return buildRenderContext({
    patient: { fullName: 'Karimova Madina Aziz qizi', phone: '998901234567', birthDate: '1992-04-12', gender: 'female', address: { street: 'Al-Xorazmiy ko‘chasi, 12-uy' }, passportNumber: 'AB1234567' },
    order: { number: 'UR-001240', createdAt: new Date().toISOString() },
    item: { serviceName: 'Namuna xizmat', approvedAt: new Date().toISOString(), technicianName: 'D. Rahimova', doctorName: 'A. Jumaniyazov', labNote: 'Namuna sifati qoniqarli', values },
    company: company ?? { name: 'Shifo Med', phone: '+998 62 228-82-81', address: 'Urganch sh., A. Bahodirxon 177' },
    branch: branch ?? { name: 'Markaziy filial', address: 'Urganch sh.' },
    schema,
    districtName: 'Urganch shahri',
  })
}
