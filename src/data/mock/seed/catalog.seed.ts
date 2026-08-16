import type {
  AttributeSchema,
  Category,
  FieldDef,
  SelectOption,
  ServiceType,
  TableField,
} from '@/domain'
import { daysAgo } from '../util'

const stamp = (d = 200) => ({ createdAt: daysAgo(d), updatedAt: daysAgo(Math.floor(d / 2)) })

const YESNO: SelectOption[] = [
  { value: 'not_detected', label: 'Aniqlanmadi', flag: 'normal', color: '#2f8a4c' },
  { value: 'detected', label: 'Aniqlandi', flag: 'abnormal', color: '#c2413f' },
]
const SENSITIVITY: SelectOption[] = [
  { value: 'S', label: 'S — sezuvchan', flag: 'normal' },
  { value: 'I', label: 'I — oraliq', flag: 'abnormal' },
  { value: 'R', label: 'R — turg‘un', flag: 'critical' },
]
const SEVERITY: SelectOption[] = [
  { value: 'none', label: 'Yo‘q', flag: 'normal' },
  { value: 'light', label: 'Yengil', flag: 'abnormal' },
  { value: 'medium', label: 'O‘rta', flag: 'abnormal' },
  { value: 'heavy', label: 'Og‘ir', flag: 'critical' },
]

const PARASITES = [
  'Ichak amyobasi (Entamoeba coli)', 'Dizenteriya amyobasi (Entamoeba histolytica)', 'Lyamblia (Lamblia intestinalis)',
  'Trixomonada (Trichomonas hominis)', 'Ostritsa (Enterobius vermicularis)', 'Askarida (Ascaris lumbricoides)',
  'Ankilostoma (Ancylostoma duodenale)', 'Qilbosh gijja (Trichocephalus trichiurus)', 'Cho‘chqa tasmasi (Taenia solium)',
  'Qoramol tasmasi (Taeniarhynchus saginatus)', 'Pakana gijja (Hymenolepis nana)', 'Keng lentasimon gijja (Diphyllobothrium latum)',
  'Jigar so‘rg‘ichi (Fasciola hepatica)', 'Exinokokk (Echinococcus granulosus)',
]
const ANTIBIOTICS = [
  'Ampitsillin', 'Ampitsillin sulbaktam', 'Penitsillin', 'Sefazolin', 'Sefotaksim', 'Siprofloksatsin', 'Seftriakson',
  'Sefoperazon', 'Sefuroksim', 'Levomitsetin', 'Moksifloksatsin', 'Norfloksatsin', 'Klindamitsin', 'Rifampitsin',
  'Ofloksatsin', 'Linkomitsin', 'Tetratsiklin', 'Levofloksatsin', 'Kanamitsin', 'Amikatsin', 'Vankomitsin', 'Gentamitsin',
  'Azitromitsin', 'Amoksitsillin', 'Eritromitsin', 'Oksatsillin',
]
const DYSBIOSIS = [
  ['Umumiy mikroorganizmlar soni', '8 mln'], ['Salmonella, shigella, patogen esherixiya', 'Bo‘lmasligi kerak'],
  ['Bifidobakteriyalar', '10⁹–10¹¹'], ['Laktobakteriyalar', '10⁹–10¹¹'], ['Laktozanegativ ichak tayoqchalari', '5 %'],
  ['Gemolitik ichak tayoqchalari', 'Bo‘lmasligi kerak'], ['To‘liq ichak tayoqchalari', '85 %'], ['Protey', 'Bo‘lmasligi kerak'],
  ['St. aureus', 'Bo‘lmasligi kerak'], ['Stafilokokklar (S. epidermidis)', '10³'], ['Kandida', 'Bo‘lmasligi kerak'],
]

const tbl = (base: Omit<TableField, 'type' | 'required' | 'order' | 'allowAddRows' | 'allowRemoveRows'> & Partial<TableField>): TableField => ({
  type: 'table', required: false, order: 0, allowAddRows: true, allowRemoveRows: true, ...base,
})
const num = (key: string, label: string, unit: string, min: number, max: number, order: number, decimals = 1): FieldDef => ({
  key, label, type: 'number', unit, required: true, order, decimals, references: [{ min, max }],
})
const sel = (key: string, label: string, options: SelectOption[], order: number, required = true): FieldDef => ({
  key, label, type: 'select', options, required, order,
})

export const SCHEMAS: AttributeSchema[] = [
  {
    id: 'sch_paraz', companyId: 'c1', name: 'Parazitologik tahlil', version: 3, status: 'published', usedBy: 1, ...stamp(300),
    description: 'Najasda parazit tuxumlari va sistalari; har bir parazit uchun daraja.',
    fields: [
      tbl({
        key: 'parasites', label: 'Tekshirilgan parazitlar', order: 1, allowAddRows: true, allowRemoveRows: false,
        columns: [
          { key: 'name', label: 'Parazit turi', type: 'text', required: true, order: 1 },
          { key: 'result', label: 'Natija', type: 'select', options: SEVERITY, required: true, order: 2 },
          { key: 'norm', label: 'Me’yor', type: 'text', required: false, order: 3 },
        ],
        presetRows: PARASITES.map((name) => ({ name, result: 'none', norm: 'bo‘lmaydi' })),
      }),
      { key: 'sample_type', label: 'Namuna turi', type: 'select', required: true, order: 2, options: [
        { value: 'stool', label: 'Najas' }, { value: 'scrape', label: 'Perianal qirindi' }, { value: 'urine', label: 'Siydik' } ] },
      { key: 'comment', label: 'Laborant izohi', type: 'longtext', required: false, order: 3, maxLength: 500 },
    ],
  },
  {
    id: 'sch_bak', companyId: 'c1', name: 'Bakteriologik ekma (umumiy)', version: 2, status: 'published', usedBy: 6, ...stamp(280),
    fields: [
      sel('growth', 'O‘sish', [
        { value: 'no_growth', label: 'O‘sish kuzatilmadi', flag: 'normal' },
        { value: 'growth', label: 'O‘sish kuzatildi', flag: 'abnormal' } ], 1),
      { key: 'organism', label: 'Ajratilgan mikroorganizm', type: 'text', required: false, order: 2, visibleIf: { key: 'growth', equals: 'growth' } },
      { key: 'titer', label: 'Titr (KOE/ml)', type: 'text', required: false, order: 3, visibleIf: { key: 'growth', equals: 'growth' } },
      { key: 'sample_type', label: 'Namuna turi', type: 'text', required: true, order: 4 },
      { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    id: 'sch_dysb', companyId: 'c1', name: 'Ichak disbakteriozi', version: 1, status: 'published', usedBy: 1, ...stamp(250),
    fields: [
      tbl({
        key: 'flora', label: 'Tekshirilgan mikroorganizmlar', order: 1, allowAddRows: false, allowRemoveRows: false,
        columns: [
          { key: 'name', label: 'Mikroorganizm', type: 'text', required: true, order: 1 },
          { key: 'found', label: 'Aniqlandi', type: 'text', required: true, order: 2 },
          { key: 'norm', label: 'Me’yor', type: 'text', required: false, order: 3 },
        ],
        presetRows: DYSBIOSIS.map(([name, norm]) => ({ name, found: '', norm })),
      }),
      { key: 'comment', label: 'Xulosa', type: 'longtext', required: false, order: 2 },
    ],
  },
  {
    id: 'sch_abg', companyId: 'c1', name: 'Mikroflora va antibiotikogramma', version: 4, status: 'published', usedBy: 2, ...stamp(240),
    fields: [
      { key: 'organism', label: 'Ajratilgan mikroorganizm', type: 'text', required: true, order: 1 },
      tbl({
        key: 'antibiotics', label: 'Antibiotiklarga sezuvchanlik', order: 2, allowAddRows: true, allowRemoveRows: true,
        columns: [
          { key: 'name', label: 'Antibiotik', type: 'text', required: true, order: 1 },
          { key: 'sens', label: 'Sezuvchanlik', type: 'select', options: SENSITIVITY, required: true, order: 2 },
        ],
        presetRows: ANTIBIOTICS.slice(0, 20).map((name) => ({ name, sens: '' })),
      }),
      { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 3 },
    ],
  },
  {
    id: 'sch_ifa', companyId: 'c1', name: 'IFA / PCR — sifat', version: 2, status: 'published', usedBy: 8, ...stamp(220),
    fields: [
      sel('result', 'Natija', YESNO, 1),
      { key: 'od', label: 'Optik zichlik (OD)', type: 'number', required: false, order: 2, decimals: 3, references: [] },
      { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 3 },
    ],
  },
  {
    id: 'sch_pcr_q', companyId: 'c1', name: 'PCR — miqdoriy', version: 1, status: 'published', usedBy: 3, ...stamp(210),
    fields: [
      sel('result', 'Natija', YESNO, 1),
      { key: 'load', label: 'Virus yuki', type: 'number', unit: 'ME/ml', required: false, order: 2, decimals: 0, references: [{ text: 'bo‘lmasligi kerak' }], visibleIf: { key: 'result', equals: 'detected' } },
      { key: 'genotype', label: 'Genotip', type: 'select', required: false, order: 3, options: ['1a', '1b', '2', '3a', '4'].map((v) => ({ value: v, label: v })) },
    ],
  },
  {
    id: 'sch_bio', companyId: 'c1', name: 'Bioximiyaviy qon tahlili', version: 5, status: 'published', usedBy: 1, ...stamp(200),
    fields: [
      num('bilirubin_total', 'Bilirubin umumiy', 'mkmol/l', 3.4, 20.5, 1),
      num('bilirubin_direct', 'Bilirubin bog‘langan', 'mkmol/l', 0.86, 5.3, 2, 2),
      num('alt', 'ALT', 'U/l', 0, 40, 3, 0),
      num('ast', 'AST', 'U/l', 0, 35, 4, 0),
      { key: 'protein', label: 'Umumiy oqsil', type: 'number', unit: 'g/l', required: true, order: 5, decimals: 1,
        references: [{ ageToMonths: 36, min: 46, max: 70 }, { ageFromMonths: 37, min: 66, max: 85 }] },
      num('albumin', 'Albumin', 'g/l', 35, 55, 6, 0),
      { key: 'glucose', label: 'Glyukoza', type: 'number', unit: 'mmol/l', required: true, order: 7, decimals: 1,
        references: [{ gender: 'male', min: 3.2, max: 6.1 }, { gender: 'female', min: 3.2, max: 5.9 }] },
      { key: 'fasting', label: 'Och qoringa', type: 'boolean', required: false, order: 8, trueLabel: 'Ha', falseLabel: 'Yo‘q' },
    ],
  },
  {
    id: 'sch_dental', companyId: 'c1', name: 'Stomatologik ko‘rik — karies', version: 1, status: 'published', usedBy: 2, ...stamp(60),
    description: 'Tish holati va karies darajasi bo‘yicha xulosa.',
    fields: [
      { key: 'complaint', label: 'Shikoyat', type: 'longtext', required: true, order: 1 },
      tbl({
        key: 'teeth', label: 'Tishlar holati', order: 2, allowAddRows: true, allowRemoveRows: true, minRows: 1,
        columns: [
          { key: 'tooth', label: 'Tish (FDI №)', type: 'text', required: true, order: 1 },
          { key: 'stage', label: 'Karies bosqichi', type: 'select', required: true, order: 2, options: [
            { value: 'initial', label: 'Boshlang‘ich (dog‘)', flag: 'abnormal' }, { value: 'superficial', label: 'Yuzaki', flag: 'abnormal' },
            { value: 'medium', label: 'O‘rta', flag: 'abnormal' }, { value: 'deep', label: 'Chuqur', flag: 'critical' } ] },
          { key: 'surface', label: 'Yuza', type: 'multiselect', required: false, order: 3, options: ['O', 'M', 'D', 'V', 'L'].map((v) => ({ value: v, label: v })) },
          { key: 'plan', label: 'Davolash rejasi', type: 'text', required: false, order: 4 },
        ],
        presetRows: [],
      }),
      sel('hygiene', 'Gigiyena indeksi', [
        { value: 'good', label: 'Yaxshi', flag: 'normal' }, { value: 'fair', label: 'Qoniqarli', flag: 'abnormal' }, { value: 'poor', label: 'Yomon', flag: 'critical' } ], 3),
      { key: 'next_visit', label: 'Keyingi tashrif', type: 'date', required: false, order: 4 },
      { key: 'recommendations', label: 'Tavsiyalar', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    id: 'sch_draft', companyId: 'c1', name: 'Umumiy qon tahlili (qoralama)', version: 1, status: 'draft', usedBy: 0, ...stamp(5),
    fields: [
      num('hb', 'Gemoglobin', 'g/l', 120, 160, 1, 0),
      num('wbc', 'Leykotsitlar', '×10⁹/l', 4, 9, 2),
      num('esr', 'ECHT', 'mm/soat', 2, 15, 3, 0),
    ],
  },
]

export const CATEGORIES: Category[] = [
  { id: 'cat_lab', companyId: 'c1', parentId: null, name: 'Laboratoriya', code: 'LAB', icon: 'FlaskConical', color: '#0f7a6b', order: 1, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_paraz', companyId: 'c1', parentId: 'cat_lab', name: 'Parazitologiya', code: 'PAR', icon: 'Bug', color: '#5b8def', order: 1, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_bak', companyId: 'c1', parentId: 'cat_lab', name: 'Bakteriologiya', code: 'BAK', icon: 'Microscope', color: '#e6a23c', order: 2, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_vir', companyId: 'c1', parentId: 'cat_lab', name: 'Virusologiya', code: 'VIR', icon: 'Dna', color: '#c2413f', order: 3, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_bio', companyId: 'c1', parentId: 'cat_lab', name: 'Bioximiya', code: 'BIO', icon: 'TestTubes', color: '#8b5cf6', order: 4, isActive: true, workflow: 'lab', ...stamp(200) },
  { id: 'cat_dent', companyId: 'c1', parentId: null, name: 'Stomatologiya', code: 'DENT', icon: 'Smile', color: '#0ea5e9', order: 2, isActive: true, workflow: 'lab', ...stamp(60) },
  { id: 'cat_caries', companyId: 'c1', parentId: 'cat_dent', name: 'Karies', code: 'CAR', icon: 'CircleDot', order: 1, isActive: true, workflow: 'lab', ...stamp(60) },
]

const svc = (id: string, categoryId: string, name: string, price: number, days: number, schemaId: string | null, order: number, extra: Partial<ServiceType> = {}): ServiceType => ({
  id, companyId: 'c1', categoryId, name, price, branchPrices: {}, turnaroundDays: days, order, isActive: true, schemaId,
  documentScope: 'item', defaultTemplateId: null, ...stamp(250), ...extra,
})

export const SERVICE_TYPES: ServiceType[] = [
  svc('st_paraz', 'cat_paraz', 'Parazitologik tahlil', 52000, 1, 'sch_paraz', 1, { code: 'PAR-01', defaultTemplateId: 'tpl_paraz' }),
  svc('st_milk', 'cat_bak', 'Ko‘krak suti tozaligi tahlili', 110000, 5, 'sch_bak', 1),
  svc('st_blood_ster', 'cat_bak', 'Qon tozaligi (sterillik) tahlili', 130000, 7, 'sch_bak', 2),
  svc('st_hemo', 'cat_bak', 'Gemokultura', 120000, 8, 'sch_bak', 3),
  svc('st_bacteriuria', 'cat_bak', 'Simptomsiz bakteriuriya (siydik)', 100000, 5, 'sch_bak', 4),
  svc('st_diph', 'cat_bak', 'Difteriya qo‘zg‘atuvchisini aniqlash', 87000, 5, 'sch_bak', 5),
  svc('st_staph', 'cat_bak', 'Patogen stafilokokk tashuvchanligi', 84000, 5, 'sch_bak', 6),
  svc('st_dysb', 'cat_bak', 'Ichak disbakteriozi tahlili', 250000, 5, 'sch_dysb', 7, { defaultTemplateId: 'tpl_table' }),
  svc('st_abg', 'cat_bak', 'Mikroflora va antibiotikogramma', 160000, 4, 'sch_abg', 8, { defaultTemplateId: 'tpl_table' }),
  svc('st_abg12', 'cat_bak', 'Antibiotik sezuvchanligi (12 disk)', 120000, 4, 'sch_abg', 9),
  svc('st_hbsag', 'cat_vir', 'IFA VG "B" (HBsAg)', 41000, 1, 'sch_ifa', 1),
  svc('st_hcv', 'cat_vir', 'IFA anti-HCV VG "C"', 41000, 1, 'sch_ifa', 2),
  svc('st_hav', 'cat_vir', 'IFA VG "A"', 42000, 1, 'sch_ifa', 3),
  svc('st_hdv', 'cat_vir', 'IFA VG "D"', 43000, 1, 'sch_ifa', 4),
  svc('st_hbv_q', 'cat_vir', 'Virusli gepatit B (DNK) miqdor', 304000, 6, 'sch_pcr_q', 5),
  svc('st_hcv_q', 'cat_vir', 'Virusli gepatit C (RNK) miqdor', 363000, 6, 'sch_pcr_q', 6),
  svc('st_hcv_geno', 'cat_vir', 'Gepatit C genotip', 361000, 6, 'sch_pcr_q', 7),
  svc('st_covid', 'cat_vir', 'PCR SARS-CoV-2', 112000, 1, 'sch_ifa', 8),
  svc('st_draw', 'cat_vir', 'Qon olish', 10000, 0, null, 9),
  svc('st_bio', 'cat_bio', 'Bioximiyaviy qon tahlili (panel)', 90000, 1, 'sch_bio', 1, { defaultTemplateId: 'tpl_bio' }),
  svc('st_caries', 'cat_caries', 'Karies bo‘yicha ko‘rik va xulosa', 80000, 0, 'sch_dental', 1, { defaultTemplateId: 'tpl_dental' }),
  svc('st_caries_tx', 'cat_caries', 'Karies davolash (1 tish)', 250000, 0, 'sch_dental', 2, { branchPrices: { b2: 230000 } }),
]
