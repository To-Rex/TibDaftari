/**
 * The page tours of this area: `<tour id>.<step key>.title` / `.body` (read as `tour.pages.<tour id>.…`).
 *
 * The catalogue of services, the result schemas and the templates of the admin panel — the pages where an
 * administrator decides what the facility offers, which fields a lab worker fills in («natija sxemasi») and what the
 * paper a patient receives looks like («andoza»). Buttons are named exactly as the interface shows them.
 */
const uz = {
  catalog: {
    intro: { title: 'Xizmatlar katalogi', body: 'Muassasada ko‘rsatiladigan barcha tahlil va xizmatlar shu yerda: narxi, muddati, natija qanday kiritilishi va qaysi blankada chiqishi. Qabulda faqat shu ro‘yxatdagi faol xizmatlar tanlanadi.' },
    tree: { title: 'Kategoriyalar', body: 'Xizmatlar kategoriyalarga bo‘lingan. Kategoriyani tanlasangiz, ro‘yxatda faqat uning xizmatlari qoladi; «Barcha xizmatlar» hammasini qaytaradi.' },
    add: { title: 'Kategoriya va xizmat qo‘shish', body: '«Yangi kategoriya» bilan yangi bo‘lim yaratasiz, «Xizmat qo‘shish» bilan — tahlil yoki xizmat: nomi, kategoriyasi, narxi, muddati. Mavjud kategoriyani o‘zgartirish — nomi ustiga borganda chiqadigan «⋯» tugmasida.' },
    list: { title: 'Xizmatlar ro‘yxati', body: 'Har bir qator — bitta xizmat: nomi, kodi, narxi, egasi. Tepada — nom yoki kod bo‘yicha qidiruv. «meros» belgisi xizmat yuqori birlik katalogidan kelganini bildiradi: bu yerda ishlatiladi, egasida o‘zgartiriladi.' },
    edit: { title: 'Xizmat sozlamalari', body: 'Qatorni bosing (yoki «⋯» → «Tahrirlash») — xizmat oynasi ochiladi. Unda «Birliklar bo‘yicha narxlar» — ayrim muassasa uchun alohida narx, «O‘chirilgan birliklar» — xizmat ko‘rsatilmaydigan muassasalar.' },
    docs: { title: 'Sxema va andoza', body: 'Natija sxemasi — laborant shu xizmat natijasini kiritganda to‘ldiradigan maydonlar. Andoza — bemor oladigan natija qog‘ozining ko‘rinishi. Nomini bossangiz, o‘sha sxema yoki andoza ochiladi.' },
    status: { title: 'Faol yoki nofaol', body: 'Faol xizmat qabulda tanlanadi. Nofaol qilingani katalogda qoladi, lekin qabulda ko‘rinmaydi. Xizmat vaqtincha to‘xtasa, uni o‘chirib yubormang — shunchaki nofaol qiling.' },
  },
  schemas: {
    intro: { title: 'Natija sxemalari', body: 'Sxema — laborant tahlil natijasini kiritganda to‘ldiradigan maydonlar ro‘yxati: ko‘rsatkichlar, o‘lchov birliklari, normalar. Har bir tahlil turiga o‘z sxemasi tuziladi va katalogda xizmatga bog‘lanadi.' },
    new: { title: 'Yangi sxema', body: '«Yangi sxema» bosilsa, bo‘sh sxema yaratiladi va darhol muharriri ochiladi — u yerda nom berasiz va maydonlarni birma-bir qo‘shasiz.' },
    search: { title: 'Qidirish va holat', body: 'Sxemani nomi yoki tavsifi bo‘yicha qidiring. Qidiruv yonidagi «Qoralama», «Nashr qilingan», «Arxiv» tugmalari ro‘yxatda faqat shu holatdagi sxemalarni qoldiradi.' },
    card: { title: 'Sxema kartasi', body: 'Kartani bossangiz, muharrir ochiladi. «Qoralama» hali tayyor emas; xizmatga faqat «Nashr qilingan» sxema bog‘lanadi. Pastda — nechta xizmatda ishlatilayotgani. O‘xshash sxema kerakmi — «⋯» → «Nusxalash».' },
  },
  schemaEditor: {
    intro: { title: 'Sxema muharriri', body: 'Bu yerda bitta tahlil natijasining maydonlarini tuzasiz — laborant aynan shularni to‘ldiradi. Sxema nomi va qisqa tavsifini shu yerning o‘zida yozasiz; yonida holati va versiyasi turadi.' },
    fields: { title: 'Maydonlar ro‘yxati', body: '«Maydon qo‘shish»ni bosib turini tanlang: «Son», «Matn», «Tanlov», «Jadval» va boshqalar. Maydonni bossangiz, sozlamalari ochiladi; «⋯» orqali joyini o‘zgartirasiz, nusxalaysiz yoki o‘chirasiz.' },
    props: { title: 'Maydon xususiyatlari', body: 'Tanlangan maydonning nomi, turi, o‘lchov birligi, majburiyligi. «Son» turida normani ham shu yerda kiritasiz — jins va yoshga qarab alohida bo‘lishi mumkin; natija shu norma bo‘yicha baholanadi.' },
    preview: { title: 'Jonli ko‘rinish', body: 'Laborant ko‘radigan forma taxminan shunday bo‘ladi: maydon qo‘shsangiz yoki o‘zgartirsangiz, darhol yangilanadi. Yuqoridagi «Ko‘rish» tugmasi bu oynani yashiradi va qaytaradi.' },
    save: { title: 'Saqlash', body: 'O‘zgarishlar o‘zi saqlanmaydi — «Saqlash»ni bosing (yoki Ctrl+S). Nashr qilingan sxemani o‘zgartirib saqlasangiz, versiyasi oshadi; ilgari kiritilgan natijalar o‘z holicha qoladi.' },
    publish: { title: 'Nashr qilish', body: 'Sxema tayyor bo‘lgach «Nashr qilish»ni bosing (kamida bitta maydon bo‘lishi kerak). Shundan keyingina uni «Xizmatlar katalogi»da xizmatga bog‘lash mumkin.' },
  },
  templates: {
    intro: { title: 'Andozalar', body: 'Andoza — bemor oladigan natija qog‘ozining (blankaning) ko‘rinishi: sarlavha, bemor ma’lumotlari, natijalar, imzo. Vrach natijani tasdiqlaganda hujjat shu andoza bo‘yicha o‘zi to‘ldiriladi.' },
    create: { title: 'Andoza qo‘shish', body: '«Yangi andoza» — bo‘sh varaqdan yoki mavjud andoza nusxasidan boshlaysiz. «Import» — fayldan yuklaydi. «Boshqa birlikdan olish» — boshqa birlikning tayyor andozalaridan nusxa oladi.' },
    coverage: { title: 'Andozasiz xizmatlar', body: 'Nechta xizmat o‘z faol andozasiga ega ekani shu yerda ko‘rinadi. Andozasi yo‘q xizmat tasdiqlanganda hujjat yaratilmaydi. Kamchilik bo‘lsa, «Ro‘yxatni ko‘rsatish» o‘sha xizmatlarni ochadi — ularga andoza kerak.' },
    find: { title: 'Qidirish va holat', body: 'Andozani nomi bo‘yicha qidiring yoki holatini tanlang: «Qoralama» hali ishlatilmaydi, «Faol» hujjatlarda ishlatiladi, «Arxiv» endi ishlatilmaydi. Shu yerda yana — saralash, ko‘rinish va bir nechtasini birga «Tanlash».' },
    filters: { title: 'Filtrlar', body: 'Andozalar ko‘p bo‘lsa, ro‘yxatni toraytiring: hujjat turi, kategoriya, xizmat, til, qog‘oz va boshqalar. Tanlangan filtr rangli bo‘lib turadi; pastda chiqadigan «Filtrlarni tozalash» hammasini qaytaradi.' },
    card: { title: 'Andozani ochish', body: 'Andozani bossangiz, vizual muharrir ochiladi. «⋯» menyusida: «Nusxalash», «Eksport (JSON)», «Faollashtirish» yoki «Arxivlash», «O‘chirish». Faol andoza o‘chirilmaydi — avval arxivlang.' },
  },
  templateEditor: {
    intro: { title: 'Andoza muharriri', body: 'Bu yerda bemor oladigan natija qog‘ozini tuzasiz: matn, maydon va jadvallarni varaqqa joylaysiz. Shu joyda andoza nomi (bosib o‘zgartirasiz) va holati turadi.' },
    tools: { title: 'Element qo‘shish', body: 'Varaqqa yangi narsa shu tugmalar bilan qo‘shiladi: «Matn», «Maydon», «Jadval», shakllar, «Rasm» (logotip, muhr), «QR kod». Tugma ustiga sichqonchani olib borsangiz, nomi chiqadi.' },
    panel: { title: 'Qatlamlar va maydonlar', body: '«Qatlamlar» — varaqdagi elementlar ro‘yxati: tanlash, yashirish, qulflash. «Maydonlar» — bemor ismi, sana, natija kabi tayyor ma’lumotlar: bossangiz varaqqa tushadi, hujjatda esa o‘rniga haqiqiy qiymat chiqadi.' },
    canvas: { title: 'Varaq', body: 'Bu — chop etiladigan hujjatning o‘zi. Elementni bosib tanlang, sudrab joyini, chetidagi kvadratchalarni tortib o‘lchamini o‘zgartiring. Matnni tahrirlash uchun ustiga ikki marta bosing.' },
    props: { title: 'Xususiyatlar', body: 'Tanlangan elementning sozlamalari: shrift, o‘lcham, rang, tekislash va boshqalar. Hech narsa tanlanmagan bo‘lsa, varaqning o‘zi sozlanadi: qog‘oz o‘lchami, yo‘nalishi, hoshiyasi.' },
    previewAs: { title: 'Qaysi xizmat misolida', body: 'Shu ro‘yxatda xizmatni tanlang: «Maydonlar»da aynan uning natija maydonlari chiqadi, «Ko‘rish» esa shu xizmat namunasida ko‘rsatadi. «Sxemasiz» tursa, natija maydonlari ro‘yxatda bo‘lmaydi.' },
    bindings: { title: 'Bog‘lanishlar', body: 'Andoza qaysi xizmatlar uchun ishlatilishi «Bog‘lanishlar»da belgilanadi (tor ekranda u «⋯» menyusi ichida). Hech bir xizmat tanlanmasa, andoza umumiy bo‘ladi — barcha xizmatlarga mos keladi.' },
    finish: { title: 'Ko‘rish, saqlash, faollashtirish', body: '«Ko‘rish» varaqni namunaviy ma’lumot bilan to‘ldirib ko‘rsatadi. «Saqlash» o‘zgarishlarni saqlaydi (Ctrl+S). Qoralama tayyor bo‘lgach «Faollashtirish»ni bosing — shundan keyin u hujjatlarda ishlatiladi.' },
  },
  receipts: {
    intro: { title: 'Chek andozalari', body: 'Kassada chop etiladigan chekning ko‘rinishi shu yerda belgilanadi. Faol andoza bo‘lsa, «Chop etish» bosilganda chek shu ko‘rinishda chiqadi; bo‘lmasa — o‘rnatilgan standart chek chop etiladi.' },
    create: { title: 'Chek andozasini qo‘shish', body: '«Standart chekni qo‘shish» tayyor chekni qoralama qilib qo‘shadi va muharrirda ochadi — o‘zingizga moslaysiz. «Yangi chek andozasi» — bo‘sh chekdan yoki nusxadan boshlash, «Import» — fayldan yuklash.' },
    find: { title: 'Qidirish va holat', body: '«Qoralama» hali chop etilmaydi, «Faol» — kassada shu chek chiqadi, «Arxiv» — endi ishlatilmaydi. Shu yerda yana — nom bo‘yicha qidiruv, saralash, ko‘rinish va bir nechtasini birga «Tanlash».' },
    filters: { title: 'Filtrlar', body: 'Ro‘yxatni til va qog‘oz o‘lchami (80 yoki 58 mm) bo‘yicha toraytirasiz. Bir nechta birlikni boshqarsangiz, birlik bo‘yicha ham: faqat o‘sha yerda ishlatiladigan chek andozalari qoladi.' },
    card: { title: 'Chek andozasini ochish', body: 'Andozani bossangiz, muharrir ochiladi. Tayyor bo‘lgach «⋯» menyusidan «Faollashtirish»ni tanlang — shundan keyin cheklar shu ko‘rinishda chop etiladi. Faol andoza o‘chirilmaydi — avval arxivlang.' },
  },
  receiptEditor: {
    intro: { title: 'Chek andozasi muharriri', body: 'Bu yerda kassa chekining ko‘rinishini tuzasiz: tashkilot nomi, chek raqami, xizmatlar jadvali, jami summa. Shu joyda andoza nomi (bosib o‘zgartirasiz) va holati turadi.' },
    tools: { title: 'Element qo‘shish', body: 'Chekka yangi narsa shu tugmalar bilan qo‘shiladi: «Matn», «Jadval», «Chiziq», «Rasm» (logotip), «QR kod» va boshqalar. Tugma ustiga sichqonchani olib borsangiz, nomi chiqadi.' },
    panel: { title: 'Qatlamlar va maydonlar', body: '«Qatlamlar» — chekdagi elementlar ro‘yxati: tanlash, yashirish, qulflash. «Maydonlar» — chek raqami, sana, jami va to‘langan summa kabi tayyor ma’lumotlar: bossangiz chekka tushadi, chop etishda haqiqiy qiymat chiqadi.' },
    canvas: { title: 'Chek varag‘i', body: 'Bu — chop etiladigan chekning o‘zi. Elementni bosib tanlang, sudrab joyini, chetidagi kvadratchalarni tortib o‘lchamini o‘zgartiring. Matnni tahrirlash uchun ustiga ikki marta bosing.' },
    props: { title: 'Xususiyatlar', body: 'Tanlangan elementning sozlamalari: shrift, o‘lcham, tekislash va boshqalar. Hech narsa tanlanmagan bo‘lsa, qog‘oz sozlanadi — printeringizga qarab «Chek 80 mm» yoki «Chek 58 mm»ni tanlang.' },
    bindings: { title: 'Qaysi birliklar uchun', body: 'Chek andozasi xizmatlarga bog‘lanmaydi. «Bog‘lanishlar»da (tor ekranda — «⋯» menyusida) uni qaysi birliklar ishlatishini tanlaysiz; tanlanmasa, egasining barcha birliklarida amal qiladi.' },
    finish: { title: 'Ko‘rish, saqlash, faollashtirish', body: '«Ko‘rish» chekni namunaviy ma’lumot bilan ko‘rsatadi. «Saqlash» o‘zgarishlarni saqlaydi (Ctrl+S). «Faollashtirish»dan keyin kassada shu chek chop etiladi.' },
  },
}

const ru: typeof uz = {
  catalog: {
    intro: { title: 'Каталог услуг', body: 'Здесь все анализы и услуги учреждения: цена, срок готовности, как вводится результат и на каком бланке он выходит. На приёме можно выбрать только активные услуги из этого списка.' },
    tree: { title: 'Категории', body: 'Услуги разложены по категориям. Выберите категорию — в списке останутся только её услуги; «Все услуги» возвращает полный список.' },
    add: { title: 'Новая категория и услуга', body: 'Кнопкой «Новая категория» создаётся раздел, кнопкой «Добавить услугу» — анализ или услуга: название, категория, цена, срок. Изменить существующую категорию можно кнопкой «⋯» — она появляется при наведении на название.' },
    list: { title: 'Список услуг', body: 'Каждая строка — одна услуга: название, код, цена, владелец. Сверху — поиск по названию или коду. Пометка «унаследовано» — услуга из каталога вышестоящего подразделения: здесь ею пользуются, а меняют у владельца.' },
    edit: { title: 'Настройки услуги', body: 'Нажмите на строку (или «⋯» → «Изменить») — откроется окно услуги. В нём «Цены по единицам» — отдельная цена для учреждения, «Отключённые единицы» — учреждения, где услуга не оказывается.' },
    docs: { title: 'Схема и шаблон', body: 'Схема результата — поля, которые лаборант заполняет, вводя результат этой услуги. Шаблон — вид бланка, который получает пациент. Нажмите на название — откроется эта схема или шаблон.' },
    status: { title: 'Активна или нет', body: 'Активную услугу можно выбрать на приёме. Неактивная остаётся в каталоге, но на приёме не видна. Если услуга временно не оказывается, не удаляйте её — просто сделайте неактивной.' },
  },
  schemas: {
    intro: { title: 'Схемы результатов', body: 'Схема — это список полей, которые лаборант заполняет, вводя результат анализа: показатели, единицы измерения, нормы. Для каждого вида анализа составляется своя схема и в каталоге привязывается к услуге.' },
    new: { title: 'Новая схема', body: 'Кнопка «Новая схема» создаёт пустую схему и сразу открывает её редактор — там вы дадите ей название и по одному добавите поля.' },
    search: { title: 'Поиск и статус', body: 'Ищите схему по названию или описанию. Кнопки «Черновик», «Опубликовано», «Архив» рядом с поиском оставляют в списке только схемы с этим статусом.' },
    card: { title: 'Карточка схемы', body: 'Нажмите на карточку — откроется редактор. «Черновик» ещё не готов; к услуге привязывается только схема со статусом «Опубликовано». Внизу — в скольких услугах она используется. Нужна похожая — «⋯» → «Дублировать».' },
  },
  schemaEditor: {
    intro: { title: 'Редактор схемы', body: 'Здесь составляются поля результата одного анализа — именно их будет заполнять лаборант. Название и короткое описание схемы пишутся прямо здесь; рядом — её статус и версия.' },
    fields: { title: 'Список полей', body: 'Нажмите «Добавить поле» и выберите тип: «Число», «Текст», «Выбор», «Таблица» и другие. Нажмите на поле — откроются его настройки; через «⋯» поле можно передвинуть, дублировать или удалить.' },
    props: { title: 'Свойства поля', body: 'Название, тип, единица измерения и обязательность выбранного поля. Для типа «Число» здесь же задаётся норма — она может быть разной по полу и возрасту; введённый результат оценивается по ней.' },
    preview: { title: 'Живой просмотр', body: 'Примерно такую форму увидит лаборант: добавьте или измените поле — и она сразу обновится. Кнопка «Просмотр» вверху скрывает и возвращает это окно.' },
    save: { title: 'Сохранение', body: 'Изменения сами не сохраняются — нажмите «Сохранить» (или Ctrl+S). Если изменить и сохранить опубликованную схему, её версия увеличится; уже введённые результаты останутся как были.' },
    publish: { title: 'Публикация', body: 'Когда схема готова, нажмите «Опубликовать» (нужно хотя бы одно поле). Только после этого её можно привязать к услуге в разделе «Каталог услуг».' },
  },
  templates: {
    intro: { title: 'Шаблоны', body: 'Шаблон — это вид бланка с результатом, который получает пациент: шапка, данные пациента, результаты, подпись. Когда врач подтверждает результат, документ сам заполняется по шаблону.' },
    create: { title: 'Добавление шаблона', body: '«Новый шаблон» — начать с чистого листа или с копии существующего. «Импорт» загружает шаблон из файла. «Взять из другой единицы» копирует готовые шаблоны другого подразделения.' },
    coverage: { title: 'Услуги без шаблона', body: 'Здесь видно, у скольких услуг есть свой активный шаблон. Если шаблона нет, при подтверждении такой услуги документ не создаётся. Если чего-то не хватает, «Показать список» откроет эти услуги — им нужен шаблон.' },
    find: { title: 'Поиск и статус', body: 'Ищите шаблон по названию или выберите статус: «Черновик» пока не используется, «Активен» — работает в документах, «Архив» — больше не нужен. Здесь же — сортировка, вид списка и «Выбрать» для действий с несколькими сразу.' },
    filters: { title: 'Фильтры', body: 'Когда шаблонов много, сузьте список: тип документа, категория, услуга, язык, бумага и другое. Выбранный фильтр подсвечен; ссылка «Сбросить фильтры», которая появляется ниже, возвращает весь список.' },
    card: { title: 'Открыть шаблон', body: 'Нажмите на шаблон — откроется визуальный редактор. В меню «⋯»: «Дублировать», «Экспорт (JSON)», «Активировать» или «В архив», «Удалить». Активный шаблон удалить нельзя — сначала отправьте его в архив.' },
  },
  templateEditor: {
    intro: { title: 'Редактор шаблона', body: 'Здесь собирается бланк результата, который получит пациент: на лист ставятся тексты, поля и таблицы. В этом месте — название шаблона (нажмите, чтобы изменить) и его статус.' },
    tools: { title: 'Добавление элементов', body: 'Этими кнопками на лист добавляется новое: «Текст», «Поле», «Таблица», фигуры, «Изображение» (логотип, печать), «QR код». Наведите мышь на кнопку — появится её название.' },
    panel: { title: 'Слои и поля', body: '«Слои» — список элементов листа: выбрать, скрыть, заблокировать. «Поля» — готовые данные: имя пациента, дата, результат. Нажмите на поле — оно встанет на лист, а в документе на его месте окажется настоящее значение.' },
    canvas: { title: 'Лист', body: 'Это сам документ, который пойдёт в печать. Нажмите на элемент, чтобы выбрать его; перетащите — чтобы передвинуть; потяните за квадратики по краям — чтобы изменить размер. Текст правится двойным щелчком.' },
    props: { title: 'Свойства', body: 'Настройки выбранного элемента: шрифт, размер, цвет, выравнивание и другое. Если ничего не выбрано, настраивается сам лист: размер бумаги, ориентация, поля.' },
    previewAs: { title: 'На примере какой услуги', body: 'Выберите в этом списке услугу: во вкладке «Поля» появятся именно её поля результата, а «Просмотр» покажет бланк на её примере. Пока стоит «Без схемы», полей результата в списке нет.' },
    bindings: { title: 'Привязки', body: 'Для каких услуг используется шаблон, задаётся кнопкой «Привязки» (на узком экране она внутри меню «⋯»). Если не выбрать ни одной услуги, шаблон будет общим — подойдёт для всех услуг.' },
    finish: { title: 'Просмотр, сохранение, активация', body: '«Просмотр» показывает лист, заполненный примером данных. «Сохранить» сохраняет изменения (Ctrl+S). Когда черновик готов, нажмите «Активировать» — после этого шаблон используется в документах.' },
  },
  receipts: {
    intro: { title: 'Шаблоны чеков', body: 'Здесь задаётся вид чека, который печатается на кассе. Если есть активный шаблон, по кнопке «Печать» чек выходит в этом виде; если нет — печатается встроенный стандартный чек.' },
    create: { title: 'Добавление шаблона чека', body: '«Добавить стандартный чек» добавляет готовый чек как черновик и открывает его в редакторе — останется подправить под себя. «Новый шаблон чека» — начать с пустого чека или с копии, «Импорт» — загрузить из файла.' },
    find: { title: 'Поиск и статус', body: '«Черновик» пока не печатается, «Активен» — этот чек выходит на кассе, «Архив» — больше не нужен. Здесь же — поиск по названию, сортировка, вид списка и «Выбрать» для действий с несколькими сразу.' },
    filters: { title: 'Фильтры', body: 'Список можно сузить по языку и размеру бумаги (80 или 58 мм). Если вы управляете несколькими подразделениями — ещё и по подразделению: останутся шаблоны чеков, которые используются именно там.' },
    card: { title: 'Открыть шаблон чека', body: 'Нажмите на шаблон — откроется редактор. Когда он готов, выберите в меню «⋯» пункт «Активировать» — после этого чеки печатаются в этом виде. Активный шаблон удалить нельзя — сначала отправьте его в архив.' },
  },
  receiptEditor: {
    intro: { title: 'Редактор шаблона чека', body: 'Здесь собирается вид кассового чека: название организации, номер чека, таблица услуг, итог. В этом месте — название шаблона (нажмите, чтобы изменить) и его статус.' },
    tools: { title: 'Добавление элементов', body: 'Этими кнопками на чек добавляется новое: «Текст», «Таблица», «Линия», «Изображение» (логотип), «QR код» и другое. Наведите мышь на кнопку — появится её название.' },
    panel: { title: 'Слои и поля', body: '«Слои» — список элементов чека: выбрать, скрыть, заблокировать. «Поля» — готовые данные: номер чека, дата, итог, оплачено. Нажмите на поле — оно встанет на чек, а при печати на его месте окажется настоящее значение.' },
    canvas: { title: 'Лента чека', body: 'Это сам чек, который пойдёт в печать. Нажмите на элемент, чтобы выбрать его; перетащите — чтобы передвинуть; потяните за квадратики по краям — чтобы изменить размер. Текст правится двойным щелчком.' },
    props: { title: 'Свойства', body: 'Настройки выбранного элемента: шрифт, размер, выравнивание и другое. Если ничего не выбрано, настраивается бумага — выберите «Чек 80 мм» или «Чек 58 мм» под ваш принтер.' },
    bindings: { title: 'Для каких подразделений', body: 'Шаблон чека не привязывается к услугам. Кнопкой «Привязки» (на узком экране — в меню «⋯») выбирают, в каких подразделениях он действует; если не выбрать — во всех подразделениях владельца.' },
    finish: { title: 'Просмотр, сохранение, активация', body: '«Просмотр» показывает чек с примером данных. «Сохранить» сохраняет изменения (Ctrl+S). После нажатия «Активировать» на кассе печатается этот чек.' },
  },
}

const en: typeof uz = {
  catalog: {
    intro: { title: 'Service catalog', body: 'Every test and service the facility offers is here: price, turnaround, how the result is entered and which form it prints on. At reception only the active services of this list can be chosen.' },
    tree: { title: 'Categories', body: 'Services are grouped into categories. Choose a category and the list keeps only its services; “All services” brings the whole list back.' },
    add: { title: 'New category and service', body: '“New category” creates a new section; “Add service” adds a test or service: name, category, price, turnaround. To change an existing category, use the “⋯” button that appears when you point at its name.' },
    list: { title: 'The list of services', body: 'Each row is one service: name, code, price, owner. Search by name or code is at the top. The “inherited” mark means the service comes from a higher unit’s catalogue: it is used here but changed at its owner.' },
    edit: { title: 'Service settings', body: 'Press the row (or “⋯” → “Edit”) to open the service window. There, “Prices per unit” sets a separate price for a facility, and “Switched-off units” lists the facilities where the service is not offered.' },
    docs: { title: 'Schema and template', body: 'The result schema is the set of fields a lab worker fills in when entering this service’s result. The template is the layout of the paper the patient receives. Press a name to open that schema or template.' },
    status: { title: 'Active or inactive', body: 'An active service can be chosen at reception. An inactive one stays in the catalogue but is hidden at reception. If a service is paused for a while, don’t delete it — just make it inactive.' },
  },
  schemas: {
    intro: { title: 'Result schemas', body: 'A schema is the list of fields a lab worker fills in when entering a test result: indicators, units, reference ranges. Each kind of test gets its own schema, which is then bound to a service in the catalogue.' },
    new: { title: 'New schema', body: '“New schema” creates an empty schema and opens its editor at once — there you name it and add the fields one by one.' },
    search: { title: 'Search and status', body: 'Search for a schema by name or description. The “Draft”, “Published” and “Archived” buttons next to the search keep only the schemas with that status.' },
    card: { title: 'A schema card', body: 'Press a card to open the editor. A “Draft” is not ready yet; only a “Published” schema can be bound to a service. At the bottom: how many services use it. Need a similar one? “⋯” → “Duplicate”.' },
  },
  schemaEditor: {
    intro: { title: 'Schema editor', body: 'Here you build the fields of one test’s result — exactly what the lab worker will fill in. The schema’s name and short description are typed right here; its status and version are beside them.' },
    fields: { title: 'The list of fields', body: 'Press “Add field” and pick a type: “Number”, “Text”, “Select”, “Table” and others. Press a field to open its settings; “⋯” moves it up or down, duplicates or deletes it.' },
    props: { title: 'Field properties', body: 'The chosen field’s label, type, unit and whether it is required. For a “Number” field the reference range is set here too — it can differ by gender and age; the entered result is judged against it.' },
    preview: { title: 'Live preview', body: 'This is roughly the form the lab worker will see: add or change a field and it updates at once. The “Preview” button at the top hides this pane and brings it back.' },
    save: { title: 'Saving', body: 'Changes are not saved by themselves — press “Save” (or Ctrl+S). Saving changes to a published schema raises its version; results entered earlier stay as they were.' },
    publish: { title: 'Publishing', body: 'When the schema is ready, press “Publish” (it needs at least one field). Only then can it be bound to a service in “Service catalog”.' },
  },
  templates: {
    intro: { title: 'Templates', body: 'A template is the layout of the result paper (the form) a patient receives: header, patient details, results, signature. When the doctor approves a result, the document is filled in from the template by itself.' },
    create: { title: 'Adding a template', body: '“New template” starts from a blank page or a copy of an existing one. “Import” loads a template from a file. “Take from another unit” copies ready templates of another unit.' },
    coverage: { title: 'Services without a template', body: 'This shows how many services have an active template of their own. Approving a service with no template creates no document. If something is missing, “Show the list” opens those services — they need a template.' },
    find: { title: 'Search and status', body: 'Search by name or pick a status: a “Draft” is not used yet, “Active” is used for documents, “Archived” is no longer used. Also here: sorting, the view, and “Select” to act on several templates at once.' },
    filters: { title: 'Filters', body: 'When there are many templates, narrow the list: document type, category, service, language, paper and more. A chosen filter is tinted; “Clear filters”, which appears below, brings the whole list back.' },
    card: { title: 'Opening a template', body: 'Press a template to open the visual editor. The “⋯” menu has “Duplicate”, “Export (JSON)”, “Activate” or “Archive”, and “Delete”. An active template cannot be deleted — archive it first.' },
  },
  templateEditor: {
    intro: { title: 'Template editor', body: 'Here you build the result paper the patient will receive: texts, fields and tables are placed on the page. This spot holds the template’s name (press to change it) and its status.' },
    tools: { title: 'Adding elements', body: 'These buttons put something new on the page: “Text”, “Field”, “Table”, shapes, “Image” (a logo, a stamp), “QR code”. Point at a button to see its name.' },
    panel: { title: 'Layers and fields', body: '“Layers” lists the elements on the page: select, hide or lock them. “Fields” are ready-made data — patient name, date, result. Press one to put it on the page; in the document the real value appears in its place.' },
    canvas: { title: 'The page', body: 'This is the document that will be printed. Press an element to select it, drag it to move it, pull the small squares on its edges to resize it. Double-click a text to edit it.' },
    props: { title: 'Properties', body: 'The settings of the selected element: font, size, colour, alignment and more. With nothing selected, the page itself is set up: paper size, orientation, margin.' },
    previewAs: { title: 'Which service to show', body: 'Pick a service in this list: the “Fields” tab then offers that service’s result fields, and “Preview” shows the form with its sample. While it says “No schema”, there are no result fields in the list.' },
    bindings: { title: 'Bindings', body: '“Bindings” sets which services use this template (on a narrower screen the button is inside the “⋯” menu). If no service is chosen, the template is generic — it fits every service.' },
    finish: { title: 'Preview, save, activate', body: '“Preview” shows the page filled with sample data. “Save” keeps your changes (Ctrl+S). When the draft is ready, press “Activate” — from then on it is used for documents.' },
  },
  receipts: {
    intro: { title: 'Receipt templates', body: 'This is where the look of the cheque printed at the cash desk is set. With an active template, “Print” gives the cheque in that layout; without one the built-in standard cheque is printed.' },
    create: { title: 'Adding a receipt template', body: '“Add the standard receipt” adds a ready-made cheque as a draft and opens it in the editor — adjust it to your needs. “New receipt template” starts from a blank cheque or a copy; “Import” loads one from a file.' },
    find: { title: 'Search and status', body: 'A “Draft” is not printed yet, “Active” is the cheque the cash desk prints, “Archived” is no longer used. Also here: search by name, sorting, the view, and “Select” to act on several at once.' },
    filters: { title: 'Filters', body: 'Narrow the list by language and paper size (80 or 58 mm). If you manage several units, by unit too: only the receipt templates used there remain.' },
    card: { title: 'Opening a receipt template', body: 'Press a template to open the editor. When it is ready, choose “Activate” in the “⋯” menu — from then on cheques print in this layout. An active template cannot be deleted — archive it first.' },
  },
  receiptEditor: {
    intro: { title: 'Receipt template editor', body: 'Here you build the look of the cash-desk cheque: organisation name, cheque number, the table of services, the total. This spot holds the template’s name (press to change it) and its status.' },
    tools: { title: 'Adding elements', body: 'These buttons put something new on the cheque: “Text”, “Table”, “Line”, “Image” (a logo), “QR code” and more. Point at a button to see its name.' },
    panel: { title: 'Layers and fields', body: '“Layers” lists the elements on the cheque: select, hide or lock them. “Fields” are ready-made data — cheque number, date, total, paid. Press one to put it on the cheque; when printed, the real value appears in its place.' },
    canvas: { title: 'The cheque', body: 'This is the cheque that will be printed. Press an element to select it, drag it to move it, pull the small squares on its edges to resize it. Double-click a text to edit it.' },
    props: { title: 'Properties', body: 'The settings of the selected element: font, size, alignment and more. With nothing selected, the paper is set up — choose “Receipt 80 mm” or “Receipt 58 mm” to match your printer.' },
    bindings: { title: 'Which units use it', body: 'A receipt template is not bound to services. “Bindings” (inside the “⋯” menu on a narrower screen) chooses the units it applies to; with none chosen it applies to every unit of its owner.' },
    finish: { title: 'Preview, save, activate', body: '“Preview” shows the cheque with sample data. “Save” keeps your changes (Ctrl+S). After “Activate” the cash desk prints this cheque.' },
  },
}

export const tourAdminCatalogLocale = { uz, ru, en }
