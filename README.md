# Clinic-Web

Ko‘p filialli klinika platformasining web ilovasi (React 19 + Vite + TypeScript). Uch modul bitta ilovada:

| Zona | URL | Kim uchun |
|---|---|---|
| Landing + login | `/`, `/login`, `/staff/login` | hamma |
| Bemor kabineti | `/me/*` | mijozlar (telefon + OTP; keyinroq Google/Apple) |
| Xodimlar ilovasi | `/app/*` | registrator, laborant, vrach, rahbar |
| Boshqaruv | `/admin/*` | kompaniya admini, superadmin |

Hozircha **mock ma’lumotlar** bilan ishlaydi (`VITE_DATA_SOURCE=mock`). Backend (FastAPI) tayyor bo‘lganda `src/data/http/` yoziladi va faqat provider almashadi.

## Ishga tushirish

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5180
npm run build      # tsc + vite build
npm run typecheck
npm run lint
```

Demo hisoblar (parol `123456`): `super`, `admin`, `umida` (registrator), `dilnoza` (laborant), `ahmed` (vrach). Bemor uchun login sahifasidagi demo raqam, OTP kod `1234`.

## Arxitektura

Qarang: [ARCHITECTURE.md](ARCHITECTURE.md). Qisqacha: `domain` (sof tiplar) ← `data` (repository kontraktlari + mock) ← `features` (hooklar/komponentlar) ← `modules` (sahifalar) ; `shared` (UI kit, i18n, theme) ; `app` (router, layout, guard).
