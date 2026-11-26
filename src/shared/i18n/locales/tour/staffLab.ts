/**
 * The page tours of this area: `<tour id>.<step key>.title` / `.body` (read as `tour.pages.<tour id>.…`).
 * `assistant` serves both `/app/assistant` and `/admin/assistant`; `confirm` is read by the approver and by the
 * registrar who only sees ready results, so its common steps say nothing only one of them can do.
 */
const uz = {
  lab: {
    intro: { title: 'Laboratoriya navbati', body: 'Natijasi kiritilishi kerak bo‘lgan tahlillar shu yerda turadi: bemor chekni to‘lashi bilan tahlil navbatga tushadi. Tahlil ustiga bosib, natijasini kiritasiz.' },
    categories: { title: 'Yo‘nalishlar', body: 'Tahlillar yo‘nalishlarga bo‘lingan. Kerakli yo‘nalishni bosing — ro‘yxatda faqat o‘shaning tahlillari qoladi. «Barchasi» hammasini qaytaradi.' },
    search: { title: 'Tahlilni qidirish', body: 'Bemorning ismi, chek raqami yoki xizmat nomini yozing — ro‘yxat yozishingiz bilan qisqaradi.' },
    status: { title: 'Tahlil holati', body: 'Tahlillarni holati bo‘yicha ajrating: «Kutilmoqda» — natija hali kiritilmagan, «Qaytarilgan» — vrach tuzatishga qaytargan. Yonidagi raqam — shu holatda nechta tahlil borligi.' },
    period: { title: 'Qaysi kunlar', body: 'Dastlab faqat bugungi tahlillar ko‘rinadi. Kechagi yoki undan oldingisi kerak bo‘lsa, «Kecha», «7 kun» yoki «Oraliq»ni tanlang.' },
    list: { title: 'Tahlillar ro‘yxati', body: 'Har bir qator — bitta tahlil: bemor, chek, xizmat va holati. Qatorni bosing — natija kiritish sahifasi ochiladi. Ro‘yxat o‘zi yangilanib turadi.' },
  },
  labItem: {
    intro: { title: 'Natija kiritish', body: 'Bitta tahlilning natijasi shu sahifada kiritiladi. Tepada xizmat, bemor va chek raqami yozilgan — avval to‘g‘ri tahlil ochilganini tekshiring. Tartib: maydonlarni to‘ldirish → «Saqlash» → «Tasdiqlashga yuborish».' },
    form: { title: 'Natija maydonlari', body: 'Har bir ko‘rsatkich qiymatini yozing. Yonida me’yor turadi: qiymat me’yordan chiqsa, katak qizaradi va ↑ yoki ↓ belgisi chiqadi. Yulduzcha (*) qo‘yilgan maydonlar majburiy.' },
    note: { title: 'Laborant izohi', body: 'Vrach bilishi kerak bo‘lgan gap bo‘lsa, shu yerga yozing — masalan, namunaning holati. To‘ldirish shart emas; izoh natija bilan birga saqlanadi va vrachga ko‘rinadi.' },
    save: { title: 'Natijani saqlash', body: '«Saqlash» kiritganlaringizni yozib qo‘yadi, lekin vrachga hali yubormaydi: tahlil «Kiritilgan» holatiga o‘tadi, keyin davom ettirishingiz mumkin. Tugma biror maydon o‘zgargandan keyin faollashadi.' },
    submit: { title: 'Tasdiqlashga yuborish', body: 'Tayyor natijani shu tugma vrachga yuboradi — o‘zgarishlar o‘zi saqlanadi. Majburiy maydon bo‘sh bo‘lsa, yuborilmaydi. Adashsangiz, vrach tasdiqlaguncha «Yuborishni bekor qilish» bilan qaytarib olasiz.' },
    after: { title: 'Yuborgandan keyin', body: 'Natijani vrach tekshiradi. Tasdiqlasa — hujjat tayyor bo‘ladi va bemorga SMS ketadi. Qaytarsa — sababi sahifa tepasida qizil yozuvda chiqadi: tuzatib, saqlab, qayta yuborasiz. Bosqichlar shu yerda belgilanib boradi.' },
  },
  confirm: {
    intro: { title: 'Natijalar bilan ishlash', body: 'Laboratoriyada kiritilgan natijalar shu sahifada ko‘rinadi. Ro‘yxatdan bemorni tanlaysiz — natijasi bemorga beriladigan hujjat ko‘rinishida ochiladi.' },
    categories: { title: 'Yo‘nalishlar', body: 'Faqat bitta yo‘nalish natijalarini ko‘rish uchun uning nomini bosing. «Barchasi» hamma yo‘nalishni birga ko‘rsatadi.' },
    queue: { title: 'Navbat va tasdiqlanganlar', body: '«Navbatda» — laboratoriya yuborgan, tasdig‘ingizni kutayotgan natijalar. Ochib tekshirasiz: to‘g‘ri bo‘lsa «Tasdiqlash», xato bo‘lsa «Qaytarish». «Tasdiqlangan» — yakunlangan natijalar.' },
    filters: { title: 'Qidiruv va davr', body: 'Bemor ismi, chek raqami yoki xizmat nomi bo‘yicha qidiring. Davr ham shu qatorda tanlanadi: dastlab oxirgi 7 kun ko‘rinadi — eskiroq natija kerak bo‘lsa, «30 kun» yoki «Oraliq»ni bosing.' },
    list: { title: 'Natijalar ro‘yxati', body: 'Har bir qatorda bemor, tahlil nomi, chek raqami va laborant yozilgan. Qatorni bosing — natija ochiladi. Yangi natija kelsa, ro‘yxatda o‘zi paydo bo‘ladi.' },
    detail: { title: 'Tanlangan natija', body: 'Natija shu yerda ochiladi: «Hujjat» — bemorga beriladigan blanka, «Qiymatlar» — kiritilgan ko‘rsatkichlar. Tasdiqlangan natijada «Natijani chop etish» va «SMSni qayta yuborish» tugmalari chiqadi.' },
    approve: { title: 'Tasdiqlash yoki qaytarish', body: '«Tasdiqlash» — natija to‘g‘ri bo‘lsa: hujjat yaratiladi, bemorga SMS ketadi va natija uning kabinetida ko‘rinadi. «Qaytarish» — xato bo‘lsa: sababini yozasiz, natija laborantga qaytadi.' },
  },
  reports: {
    intro: { title: 'Hisobotlar sahifasi', body: 'Muassasa ishi raqamlarda: cheklar, bemorlar, natijalar. Sarlavha ostidagi yorliqlar — bo‘limlar: «Umumiy», «Bemorlar», «Natijalar», «Xizmatlar», «SMS». Keraklisini bosing.' },
    period: { title: 'Hisobot davri', body: 'Hisobot qaysi kunlar uchunligini shu yerda tanlaysiz. «Oraliq»ni bossangiz, boshlanish va tugash sanasini o‘zingiz kiritasiz. Sahifadagi raqamlar shu davr bo‘yicha qayta hisoblanadi.' },
    numbers: { title: 'Asosiy raqamlar', body: '«Cheklar» — tanlangan davrda ochilgan cheklar soni, «Bugun» — bugungilari. «Laboratoriyada» va «Tasdiqlashda» — ayni paytda natijasi kutilayotgan tahlillar.' },
    trend: { title: 'Kunlik dinamika', body: 'Davr ichida ish kunma-kun qanday o‘zgargani. Sichqonchani chiziq ustida yurgizing — o‘sha kunning aniq raqami chiqadi.' },
    breakdown: { title: 'Taqsimot jadvali', body: 'Shu davrdagi ish nimalardan iborat bo‘lgani. «Yo‘nalish», «Xizmat» yoki «Xodim» yorlig‘ini bosing — jadval va doira diagramma shu bo‘yicha ko‘rsatadi; eng ko‘pi tepada turadi.' },
    export: { title: 'Excelga yuklab olish', body: '«Excel» — tanlangan davr bo‘yicha batafsil hisobotni fayl qilib yuklab oladi. «Umumiy» bo‘limidagi «Excel (CSV)» esa faqat pastdagi jadvalni yuklaydi.' },
  },
  messages: {
    intro: { title: 'SMS xabarlar', body: 'Bemorlarga ketgan barcha SMS’lar shu yerda yoziladi: to‘lov cheki, natija tayyorligi, kodlar va o‘zingiz yozgan xabarlar. Xabar yetib borgan-bormaganini shu yerdan tekshirasiz.' },
    search: { title: 'Qidiruv va holat yorliqlari', body: 'Telefon raqami yoki xabar matnidan bir bo‘lagini yozib qidiring. Ustidagi yorliqlar xabarlarni holati bo‘yicha ajratadi — masalan, «Xato» faqat yuborilmaganlarini ko‘rsatadi.' },
    list: { title: 'Xabarlar jurnali', body: 'Har bir qator — bitta SMS: kimga ketgani, matni, turi va vaqti. Eng yangisi tepada. Yuborilayotgan xabar bo‘lsa, ro‘yxat o‘zi yangilanib turadi.' },
    status: { title: 'Xabar holati', body: '«Navbatda» — hali ketmagan, «Yuborildi» — operatorga topshirilgan, «Yetkazildi» — bemor telefoniga yetgan. «Xato» bo‘lsa, sababi shu yerda qizil yozuvda turadi.' },
    newMessage: { title: 'Yangi xabar yozish', body: '«Yangi xabar» tugmasi yon oynani ochadi: telefon raqamini va matnni yozib, «Yuborish»ni bosasiz. «Keyinroq yuborish»ni yoqsangiz, xabar siz belgilagan vaqtda ketadi.' },
  },
  assistant: {
    intro: { title: 'Yordamchi bilan tanishing', body: 'Yordamchiga savolingizni oddiy so‘zlar bilan yozasiz — u kerakli ma’lumotni topib beradi va rolingiz ruxsat bergan ishlarni bajarishga yordam beradi. Menyudan qidirib yurish shart emas.' },
    composer: { title: 'Savolingizni yozing', body: 'Savol yoki topshiriqni shu yerga yozib, Enter tugmasini bosing — javob shu sahifada chiqadi. Rolingiz bo‘yicha nimalarni so‘rash mumkinligini yozuv ostidagi «Imkoniyatlar» tugmasi ko‘rsatadi.' },
    examples: { title: 'Tayyor misollar', body: 'Nimadan boshlashni bilmasangiz, misollardan birini bosing — u darhol yordamchiga yuboriladi. Misollar rolingizga qarab tanlangan.' },
    confirm: { title: 'Avval sizdan so‘raydi', body: 'Yordamchi ma’lumotni o‘zi topadi, lekin biror narsani o‘zgartirishdan oldin nima qilmoqchi ekanini ko‘rsatadi. «Tasdiqlash va bajarish»ni bossangizgina bajaradi; «Bekor qilish»ni bossangiz, hech narsa o‘zgarmaydi.' },
    history: { title: 'Suhbatlar tarixi', body: 'Chapdagi tugma avvalgi suhbatlaringiz ro‘yxatini ochadi — istalganini bosib davom ettirasiz. Yonidagi qalamli tugma — «Yangi suhbat»: boshqa mavzuni yangi suhbatda so‘rang.' },
    tasks: { title: 'Rejali topshiriqlar', body: 'Takrorlanadigan ishni bir marta yozib qo‘yasiz — masalan, har kuni ertalab kechagi hisobot. Yordamchi uni belgilangan vaqtda o‘zi bajaradi (faqat o‘qiydi, hech narsani o‘zgartirmaydi) va sizga bildirishnoma keladi.' },
  },
}

const ru: typeof uz = {
  lab: {
    intro: { title: 'Очередь лаборатории', body: 'Здесь стоят анализы, по которым нужно ввести результат: анализ попадает в очередь, как только пациент оплатит чек. Нажмите на анализ, чтобы ввести результат.' },
    categories: { title: 'Направления', body: 'Анализы разделены по направлениям. Нажмите нужное — в списке останутся только его анализы. «Все» возвращает полный список.' },
    search: { title: 'Поиск анализа', body: 'Введите имя пациента, номер чека или название услуги — список сокращается по мере ввода.' },
    status: { title: 'Статус анализа', body: 'Отбор по статусу: «Ожидает» — результат ещё не введён, «Возвращено» — врач вернул на исправление. Число рядом — сколько анализов в этом статусе.' },
    period: { title: 'За какие дни', body: 'Сначала показаны только сегодняшние анализы. Если нужен вчерашний или более ранний, выберите «Вчера», «7 дней» или «Период».' },
    list: { title: 'Список анализов', body: 'Каждая строка — один анализ: пациент, чек, услуга и статус. Нажмите на строку — откроется страница ввода результата. Список обновляется сам.' },
  },
  labItem: {
    intro: { title: 'Ввод результата', body: 'На этой странице вводится результат одного анализа. Вверху — услуга, пациент и номер чека: сначала убедитесь, что открыт нужный анализ. Порядок: заполнить поля → «Сохранить» → «Отправить на подтверждение».' },
    form: { title: 'Поля результата', body: 'Введите значение каждого показателя. Рядом указана норма: если значение выходит за неё, поле краснеет и появляется знак ↑ или ↓. Поля со звёздочкой (*) обязательны.' },
    note: { title: 'Комментарий лаборанта', body: 'Если врачу нужно что-то знать — например, о состоянии образца, — напишите здесь. Заполнять необязательно; комментарий сохраняется вместе с результатом, и врач его увидит.' },
    save: { title: 'Сохранение результата', body: '«Сохранить» записывает введённое, но врачу пока не отправляет: анализ получает статус «Введено», и к нему можно вернуться позже. Кнопка становится активной после изменения любого поля.' },
    submit: { title: 'Отправка на подтверждение', body: 'Эта кнопка отправляет готовый результат врачу — изменения сохранятся сами. Если обязательное поле пустое, результат не уйдёт. Ошиблись — пока врач не подтвердил, его можно забрать кнопкой «Отменить отправку».' },
    after: { title: 'Что будет после отправки', body: 'Результат проверяет врач. Подтвердит — документ готов, пациенту уйдёт SMS. Вернёт — причина появится красной строкой вверху страницы: исправьте, сохраните и отправьте снова. Этапы отмечаются здесь.' },
  },
  confirm: {
    intro: { title: 'Работа с результатами', body: 'На этой странице видны результаты, введённые в лаборатории. Выберите пациента в списке — результат откроется в виде документа, который получит пациент.' },
    categories: { title: 'Направления', body: 'Чтобы видеть результаты только одного направления, нажмите на его название. «Все» показывает все направления вместе.' },
    queue: { title: 'Очередь и подтверждённые', body: '«В очереди» — результаты из лаборатории, которые ждут вашего подтверждения. Откройте и проверьте: всё верно — «Подтвердить», есть ошибка — «Вернуть». «Подтверждённые» — уже завершённые.' },
    filters: { title: 'Поиск и период', body: 'Ищите по имени пациента, номеру чека или названию услуги. Период выбирается в этой же строке: сначала показаны последние 7 дней — для более старых результатов нажмите «30 дней» или «Период».' },
    list: { title: 'Список результатов', body: 'В каждой строке — пациент, название анализа, номер чека и лаборант. Нажмите на строку — результат откроется. Новые результаты появляются в списке сами.' },
    detail: { title: 'Выбранный результат', body: 'Результат открывается здесь: «Документ» — бланк, который получит пациент, «Значения» — введённые показатели. У подтверждённого результата есть кнопки «Печать результата» и «Отправить SMS повторно».' },
    approve: { title: 'Подтвердить или вернуть', body: '«Подтвердить» — если всё верно: создаётся документ, пациенту уходит SMS, результат появляется в его кабинете. «Вернуть» — если есть ошибка: вы пишете причину, и результат возвращается лаборанту.' },
  },
  reports: {
    intro: { title: 'Страница отчётов', body: 'Работа учреждения в цифрах: чеки, пациенты, результаты. Вкладки под заголовком — разделы: «Общее», «Пациенты», «Результаты», «Услуги», «SMS». Нажмите нужный.' },
    period: { title: 'Период отчёта', body: 'Здесь выбирается, за какие дни строится отчёт. Нажмите «Период», чтобы самому указать дату начала и конца. Все цифры на странице пересчитываются за выбранные дни.' },
    numbers: { title: 'Главные цифры', body: '«Чеки» — сколько чеков открыто за выбранный период, «Сегодня» — за сегодня. «В лаборатории» и «На подтверждении» — анализы, результата которых ждут прямо сейчас.' },
    trend: { title: 'Динамика по дням', body: 'Как менялась работа день за днём в выбранном периоде. Проведите мышью по линии — появится точная цифра за этот день.' },
    breakdown: { title: 'Таблица по разрезам', body: 'Из чего сложилась работа за период. Нажмите вкладку «Направление», «Услуга» или «Сотрудник» — таблица и круговая диаграмма покажут этот разрез; самое большое — сверху.' },
    export: { title: 'Выгрузка в Excel', body: '«Excel» скачивает файл с подробным отчётом за выбранный период. «Excel (CSV)» в разделе «Общее» скачивает только нижнюю таблицу.' },
  },
  messages: {
    intro: { title: 'SMS-сообщения', body: 'Здесь записаны все SMS, отправленные пациентам: чеки об оплате, сообщения о готовом результате, коды и те, что написали вы сами. Здесь же видно, дошло сообщение или нет.' },
    search: { title: 'Поиск и вкладки статусов', body: 'Ищите по номеру телефона или части текста. Вкладки выше отбирают сообщения по статусу — например, «Ошибка» покажет только неотправленные.' },
    list: { title: 'Журнал сообщений', body: 'Каждая строка — одно SMS: кому ушло, текст, тип и время. Самые новые — сверху. Пока есть отправляемые сообщения, список обновляется сам.' },
    status: { title: 'Статус сообщения', body: '«В очереди» — ещё не ушло, «Отправлено» — передано оператору, «Доставлено» — дошло до телефона пациента. При статусе «Ошибка» причина написана здесь красным.' },
    newMessage: { title: 'Новое сообщение', body: 'Кнопка «Новое сообщение» открывает боковую панель: введите номер телефона и текст, затем нажмите «Отправить». Включите «Отправить позже» — и сообщение уйдёт в указанное вами время.' },
  },
  assistant: {
    intro: { title: 'Знакомьтесь: помощник', body: 'Помощнику можно написать вопрос обычными словами — он найдёт нужные данные и поможет сделать то, что разрешает ваша роль. Искать по меню не нужно.' },
    composer: { title: 'Напишите вопрос', body: 'Напишите здесь вопрос или поручение и нажмите Enter — ответ появится на этой странице. Что можно просить в вашей роли, показывает кнопка «Возможности» под строкой ввода.' },
    examples: { title: 'Готовые примеры', body: 'Не знаете, с чего начать, — нажмите один из примеров: он сразу отправится помощнику. Примеры подобраны под вашу роль.' },
    confirm: { title: 'Сначала спросит вас', body: 'Данные помощник находит сам, но прежде чем что-то изменить, он показывает, что собирается сделать. Выполнит только после нажатия «Подтвердить и выполнить»; нажмёте «Отменить» — ничего не изменится.' },
    history: { title: 'История диалогов', body: 'Кнопка слева открывает список ваших прошлых диалогов — нажмите любой, чтобы продолжить. Кнопка с карандашом рядом — «Новый диалог»: новую тему лучше начинать в нём.' },
    tasks: { title: 'Задачи по расписанию', body: 'Повторяющееся дело достаточно описать один раз — например, отчёт за вчера каждое утро. Помощник выполнит его сам в назначенное время (только читает данные, ничего не меняет) и пришлёт уведомление.' },
  },
}

const en: typeof uz = {
  lab: {
    intro: { title: 'The lab queue', body: 'Tests that need a result wait here: a test joins the queue as soon as the patient pays the order. Click a test to enter its result.' },
    categories: { title: 'Categories', body: 'Tests are grouped by category. Click one and the list keeps only its tests. “All” brings the full list back.' },
    search: { title: 'Find a test', body: 'Type the patient’s name, the order number or the service name — the list narrows as you type.' },
    status: { title: 'Test status', body: 'Filter by status: “Pending” — no result entered yet, “Returned” — the doctor sent it back to be corrected. The number beside each is how many tests are in that status.' },
    period: { title: 'Which days', body: 'At first only today’s tests are shown. If you need one from yesterday or earlier, choose “Yesterday”, “7 days” or “Custom”.' },
    list: { title: 'The list of tests', body: 'Each row is one test: patient, order, service and status. Click a row to open the result entry page. The list refreshes by itself.' },
  },
  labItem: {
    intro: { title: 'Entering a result', body: 'The result of one test is entered on this page. The service, patient and order number are at the top — first check that the right test is open. The order: fill in the fields → “Save” → “Send for approval”.' },
    form: { title: 'Result fields', body: 'Type the value of each item. The reference range is shown beside it: if a value falls outside, the box turns red and an ↑ or ↓ mark appears. Fields with an asterisk (*) are required.' },
    note: { title: 'Lab note', body: 'If the doctor should know something — the condition of the sample, for example — write it here. It is optional; the note is saved with the result and the doctor will see it.' },
    save: { title: 'Saving the result', body: '“Save” stores what you typed but does not send it to the doctor yet: the test becomes “Entered” and you can come back to it later. The button turns active once any field changes.' },
    submit: { title: 'Sending for approval', body: 'This button sends the finished result to the doctor — your changes are saved along the way. If a required field is empty, nothing is sent. Made a mistake? Until the doctor approves, “Withdraw submission” takes it back.' },
    after: { title: 'After you send it', body: 'The doctor checks the result. If approved, the document is ready and the patient gets an SMS. If returned, the reason appears in red at the top of the page: correct, save and send again. The stages are ticked off here.' },
  },
  confirm: {
    intro: { title: 'Working with results', body: 'Results entered in the laboratory show up on this page. Pick a patient in the list and the result opens as the document the patient will receive.' },
    categories: { title: 'Categories', body: 'To see the results of one category only, click its name. “All” shows every category together.' },
    queue: { title: 'Queue and approved', body: '“Queue” — results the lab has sent that wait for your approval. Open and check each: if it is right, “Approve”; if something is wrong, “Return”. “Approved” — the finished ones.' },
    filters: { title: 'Search and period', body: 'Search by patient name, order number or service name. The period is chosen in the same row: the last 7 days are shown at first — for older results click “30 days” or “Custom”.' },
    list: { title: 'The list of results', body: 'Each row shows the patient, the test, the order number and the technician. Click a row to open the result. New results appear in the list by themselves.' },
    detail: { title: 'The selected result', body: 'The result opens here: “Document” is the sheet the patient receives, “Values” are the figures that were entered. An approved result has the “Print result” and “Re-send SMS” buttons.' },
    approve: { title: 'Approve or return', body: '“Approve” — when the result is right: the document is created, the patient gets an SMS and sees it in their portal. “Return” — when something is wrong: you write the reason and the result goes back to the technician.' },
  },
  reports: {
    intro: { title: 'The reports page', body: 'The facility’s work in numbers: orders, patients, results. The tabs under the heading are sections: “Overview”, “Patients”, “Results”, “Services”, “SMS”. Click the one you need.' },
    period: { title: 'Report period', body: 'Choose here which days the report covers. Click “Custom” to enter the start and end dates yourself. Every number on the page is recalculated for the chosen days.' },
    numbers: { title: 'Key numbers', body: '“Orders” — how many orders were opened in the chosen period; “Today” — today’s. “In lab” and “Awaiting approval” — tests whose result is being waited for right now.' },
    trend: { title: 'Day-by-day trend', body: 'How the work changed day by day within the period. Move the mouse along the line to see the exact figure for that day.' },
    breakdown: { title: 'Breakdown table', body: 'What the period’s work was made of. Click the “Category”, “Service” or “Employee” tab — the table and the pie chart show that breakdown, the largest first.' },
    export: { title: 'Download to Excel', body: '“Excel” downloads a file with the detailed report for the chosen period. “Excel (CSV)” in the “Overview” section downloads only the table at the bottom.' },
  },
  messages: {
    intro: { title: 'SMS messages', body: 'Every SMS sent to patients is recorded here: payment receipts, result-ready notices, codes and the ones you write yourself. This is where you check whether a message arrived.' },
    search: { title: 'Search and status tabs', body: 'Search by phone number or a piece of the text. The tabs above filter messages by status — “Failed”, for example, shows only those that were not sent.' },
    list: { title: 'The message log', body: 'Each row is one SMS: who it went to, its text, kind and time. The newest are on top. While messages are on their way, the list refreshes by itself.' },
    status: { title: 'Message status', body: '“Queued” — not sent yet, “Sent” — handed to the operator, “Delivered” — reached the patient’s phone. With “Failed”, the reason is written here in red.' },
    newMessage: { title: 'Writing a new message', body: 'The “New message” button opens a side panel: type the phone number and the text, then press “Send”. Switch on “Send later” and the message goes out at the time you set.' },
  },
  assistant: {
    intro: { title: 'Meet the assistant', body: 'Write your question to the assistant in plain words — it finds the data you need and helps with the work your role allows. No need to hunt through the menu.' },
    composer: { title: 'Type your question', body: 'Type a question or a task here and press Enter — the answer appears on this page. The “Capabilities” button under the text line shows what you can ask for in your role.' },
    examples: { title: 'Ready examples', body: 'Not sure where to start? Click one of the examples — it is sent to the assistant right away. The examples are picked for your role.' },
    confirm: { title: 'It asks you first', body: 'The assistant looks data up by itself, but before changing anything it shows what it is about to do. It acts only after you press “Confirm and run”; press “Cancel” and nothing changes.' },
    history: { title: 'Chat history', body: 'The button on the left opens the list of your earlier chats — click any to continue it. The pencil button next to it is “New chat”: start a new topic there.' },
    tasks: { title: 'Scheduled tasks', body: 'Describe a repeating job once — yesterday’s report every morning, for example. The assistant runs it by itself at the set time (it only reads, it changes nothing) and you get a notification.' },
  },
}

export const tourStaffLabLocale = { uz, ru, en }
