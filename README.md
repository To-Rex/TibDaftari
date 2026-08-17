# TibDaftari — web ilova

Ko‘p filialli klinika platformasining web ilovasi (React 19 + Vite + TypeScript). Uch modul bitta ilovada:

| Zona | URL | Kim uchun |
|---|---|---|
| Landing + login | `/`, `/login`, `/staff/login` | hamma |
| Bemor kabineti | `/me/*` | mijozlar (telefon + OTP; keyinroq Google/Apple) |
| Xodimlar ilovasi | `/app/*` | registrator, laborant, vrach, rahbar |
| Boshqaruv | `/admin/*` | kompaniya admini, superadmin |

Ma’lumotlar **TibDaftari-Backend** (FastAPI) dan olinadi: `src/data/http/*` repositorylari `VITE_API_URL` (`…/api/v1`) manziliga so‘rov yuboradi. Dev uchun `.env` (`http://localhost:8000/api/v1`), production build uchun `.env.production`.

## Ishga tushirish

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5180 (PORT env bilan o‘zgartiriladi)
npm run build      # tsc + vite build
npm run typecheck
npm run lint
```

Demo hisoblar (backend seed, parol `123456`): `super`, `admin`, `umida` (registrator), `dilnoza` (laborant), `ahmed` (vrach). Bemor OTP kodi backend dev rejimida (`OTP_DEV_MODE`) javobda `devCode` sifatida qaytadi va login sahifasida ko‘rsatiladi.

## Arxitektura

Qarang: [ARCHITECTURE.md](ARCHITECTURE.md). Qisqacha: `domain` (sof tiplar) ← `data` (repository kontraktlari + http implementatsiya) ← `features` (hooklar/komponentlar) ← `modules` (sahifalar) ; `shared` (UI kit, i18n, theme) ; `app` (router, layout, guard).

## Deploy (Dokploy + Railpack)

Xabarchi-Web bilan bir xil usul: GitHub repo → Dokploy ilovasi (Build type: **Railpack**). Railpack `railpack.json` va `package.json` dan Node 22 + Vite SPA ekanini aniqlaydi, `npm ci` → `npm run build` bajaradi va `dist/` ni Caddy orqali (SPA fallback bilan, `/app/*`, `/admin/*`, `/me/*` marshrutlar ishlaydi) `PORT` da uzatadi. Alohida start-komanda kerak emas.

Dokploy'da:
- **Environment**: `VITE_API_URL=https://<backend>/api/v1` (`.env.production` da default qiymat bor; Vite build-time o‘zgaruvchi — o‘zgartirsangiz qayta build kerak).
- **Health check**: `GET /` (200).
- Git push → avtomatik deploy.
