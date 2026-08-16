import type { DeepPartial } from '../types'
import type { Dictionary } from './uz'

export const ru: DeepPartial<Dictionary> = {
  common: {
    appName: 'Clinic', loading: 'Загрузка…', save: 'Сохранить', saving: 'Сохранение…', cancel: 'Отмена', close: 'Закрыть', delete: 'Удалить', edit: 'Изменить',
    create: 'Создать', add: 'Добавить', search: 'Поиск', searchPlaceholder: 'Поиск…', filter: 'Фильтр', all: 'Все', yes: 'Да', no: 'Нет', back: 'Назад', next: 'Далее', done: 'Готово',
    actions: 'Действия', status: 'Статус', date: 'Дата', today: 'Сегодня', yesterday: 'Вчера', last7: '7 дней', last30: '30 дней', thisMonth: 'Этот месяц', total: 'Итого', sum: 'сум',
    empty: 'Ничего не найдено', emptyHint: 'Измените поиск или фильтр', error: 'Произошла ошибка', retry: 'Повторить', required: 'Обязательное поле', optional: 'необязательно',
    confirm: 'Подтвердить', areYouSure: 'Вы уверены?', perPage: 'На странице', of: '/', rows: 'строк', page: 'Страница', noAccess: 'У вас нет доступа к этому разделу', logout: 'Выйти',
    profile: 'Профиль', settings: 'Настройки', language: 'Язык', theme: 'Тема', themeLight: 'Светлая', themeDark: 'Тёмная', themeSystem: 'Системная', copy: 'Копировать', copied: 'Скопировано',
    print: 'Печать', download: 'Скачать', preview: 'Просмотр', active: 'Активен', inactive: 'Неактивен', draft: 'Черновик', archived: 'Архив', published: 'Опубликовано', version: 'Версия',
    name: 'Название', phone: 'Телефон', fullName: 'Ф.И.О.', birthDate: 'Дата рождения', gender: 'Пол', male: 'Мужской', female: 'Женский', address: 'Адрес', branch: 'Филиал',
    allBranches: 'Все филиалы', company: 'Компания', price: 'Цена', days: 'дн.', seeAll: 'Показать все', new: 'Новый', unsaved: 'Есть несохранённые изменения',
    leaveConfirm: 'Несохранённые изменения будут потеряны. Выйти?', more: 'Ещё', less: 'Меньше', select: 'Выберите', notSet: '—',
  },
  nav: {
    dashboard: 'Главная', reception: 'Регистратура', patients: 'Пациенты', orders: 'Чеки', lab: 'Лаборатория', confirm: 'Подтверждение', reports: 'Отчёты', messages: 'Сообщения',
    admin: 'Управление', company: 'Компания', branches: 'Филиалы', employees: 'Сотрудники', roles: 'Роли и права', catalog: 'Каталог услуг', schemas: 'Схемы результатов',
    templates: 'Шаблоны', smsSettings: 'Настройки SMS', platform: 'Платформа', portalHome: 'Кабинет', portalResults: 'Результаты', portalVisits: 'Визиты', portalProfile: 'Профиль', staffApp: 'Приложение сотрудников',
  },
  auth: {
    staffTitle: 'Вход для сотрудников', staffSubtitle: 'Введите логин и пароль', login: 'Логин', password: 'Пароль', signIn: 'Войти', signingIn: 'Проверка…',
    patientTitle: 'Кабинет пациента', patientSubtitle: 'Мы отправим код подтверждения на ваш номер', phone: 'Номер телефона', sendCode: 'Отправить код', codeSent: 'Код отправлен',
    enterCode: 'Введите 4-значный код, отправленный на {{phone}}', verify: 'Подтвердить', resend: 'Отправить снова', resendIn: 'Отправить снова ({{s}} с)', changePhone: 'Изменить номер',
    orContinueWith: 'или', google: 'Войти через Google', apple: 'Войти через Apple', soon: 'скоро', devHint: 'Демо-код: {{code}}', demoAccounts: 'Демо-аккаунты', demoPassword: 'Пароль: 123456',
    forStaff: 'Вы сотрудник?', forPatients: 'Вы пациент?', staffLink: 'Вход для сотрудников', patientLink: 'Войти в кабинет пациента', sessionExpired: 'Сессия истекла, войдите снова',
  },
  landing: {
    heroEyebrow: 'Единая платформа для клиник и пациентов', heroTitle: 'Ваши результаты — мгновенно, в одном месте',
    heroSubtitle: 'Результаты анализов, визиты и документы в защищённом кабинете по номеру телефона. Для клиник — приём, лаборатория, подтверждение и SMS в одной системе.',
    ctaPatient: 'Посмотреть результаты', ctaStaff: 'Для сотрудников', feat1Title: 'Результат готов — приходит SMS', feat1Text: 'Как только врач подтвердит, результат появится в кабинете и придёт SMS.',
    feat2Title: 'Все документы сохраняются', feat2Text: 'PDF-бланки, чеки и история визитов — скачивайте в любое время.', feat3Title: 'Для сетевых клиник',
    feat3Text: 'Компания → филиал → сотрудник. Роли, права, отчёты и динамические шаблоны.', stat1: 'результатов доставлено', stat2: 'клиник', stat3: 'среднее ожидание',
    footer: '© {{year}} Clinic. Все права защищены.', demoBadge: 'Демо-режим — тестовые данные',
  },
}
