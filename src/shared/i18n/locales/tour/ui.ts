/**
 * The tours' own words — the buttons of a step and the «?» menu. They are in the main bundle (the «?» button is
 * always on screen); the sentences of the tours themselves (`../tour.ts`) are fetched when a tour is first needed.
 */
const uz = {
  ui: {
    help: 'Yo‘riqnoma',
    start: 'Boshlash', next: 'Keyingi', back: 'Orqaga', done: 'Tushunarli', skip: 'O‘tkazib yuborish', close: 'Yopish',
    step: '{{n}} / {{total}}',
    keys: 'Klaviaturada: ← → — qadamlar, Esc — yopish',
    page: 'Shu sahifa yo‘riqnomasi', pageSub: 'Ochiq turgan sahifadagi tugmalar', pageNone: 'Bu sahifada yo‘riqnoma yo‘q',
    general: 'Umumiy tanishuv', generalSub: 'Menyu va yuqori panel',
    auto: 'Yangi sahifada yo‘riqnoma o‘zi ochilsin',
    reopenTitle: 'Yo‘riqnoma yopildi', reopenHint: 'Istalgan payt yuqoridagi «?» tugmasidan qayta ochasiz.',
  },
}

const ru: typeof uz = {
  ui: {
    help: 'Подсказки',
    start: 'Начать', next: 'Далее', back: 'Назад', done: 'Понятно', skip: 'Пропустить', close: 'Закрыть',
    step: '{{n}} / {{total}}',
    keys: 'С клавиатуры: ← → — шаги, Esc — закрыть',
    page: 'Подсказки по этой странице', pageSub: 'Кнопки открытой страницы', pageNone: 'Для этой страницы подсказок нет',
    general: 'Общее знакомство', generalSub: 'Меню и верхняя панель',
    auto: 'Показывать подсказки на новой странице',
    reopenTitle: 'Подсказки закрыты', reopenHint: 'Открыть их снова можно в любой момент — кнопка «?» вверху.',
  },
}

const en: typeof uz = {
  ui: {
    help: 'Guide',
    start: 'Start', next: 'Next', back: 'Back', done: 'Got it', skip: 'Skip', close: 'Close',
    step: '{{n}} / {{total}}',
    keys: 'On the keyboard: ← → to step, Esc to close',
    page: 'Guide to this page', pageSub: 'The buttons of the open page', pageNone: 'This page has no guide',
    general: 'General tour', generalSub: 'The menu and the top bar',
    auto: 'Open the guide by itself on a new page',
    reopenTitle: 'Guide closed', reopenHint: 'Open it again at any time with the “?” button at the top.',
  },
}

export const tourUiLocale = { uz, ru, en }
