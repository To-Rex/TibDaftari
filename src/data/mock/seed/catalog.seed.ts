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

/** Categories — identical to the NavbatApp `category` table (ids 1/2/3, original spelling). */
export const CATEGORIES: Category[] = [
  { id: 'cat_paraz', companyId: 'c1', parentId: null, name: 'Parozitologiya', code: 'PAR', phone: '97-092-08-88; 97-457-83-89', icon: 'Bug', color: '#5b8def', order: 1, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_bak', companyId: 'c1', parentId: null, name: 'Bakteriologiya', code: 'BAK', phone: '91-424-04-83; 93-093-29-92', icon: 'Microscope', color: '#e6a23c', order: 2, isActive: true, workflow: 'lab', ...stamp(300) },
  { id: 'cat_vir', companyId: 'c1', parentId: null, name: 'Virusalogiya', code: 'VIR', phone: '93-207-82-88; 91-427-99-91', icon: 'Dna', color: '#c2413f', order: 3, isActive: true, workflow: 'lab', ...stamp(300) },
]

/** Service types come exclusively from the NavbatApp `product` table (see legacy.seed.ts). */
export const SERVICE_TYPES: ServiceType[] = []
