# TibDaftari — web ilova

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
npm run dev        # http://localhost:5180 (PORT env bilan o‘zgartiriladi)
npm run build      # tsc + vite build
npm run typecheck
npm run lint
```

Demo hisoblar (parol `123456`): `super`, `admin`, `umida` (registrator), `dilnoza` (laborant), `ahmed` (vrach). Bemor uchun login sahifasidagi demo raqam, OTP kod `1234`.

## Arxitektura

Qarang: [ARCHITECTURE.md](ARCHITECTURE.md). Qisqacha: `domain` (sof tiplar) ← `data` (repository kontraktlari + mock) ← `features` (hooklar/komponentlar) ← `modules` (sahifalar) ; `shared` (UI kit, i18n, theme) ; `app` (router, layout, guard).

## Deploy (Dokploy + Railpack)

Xabarchi-Web bilan bir xil usul: GitHub repo → Dokploy ilovasi (Build type: **Railpack**). Railpack `railpack.json` va `package.json` dan Node 22 + Vite SPA ekanini aniqlaydi, `npm ci` → `npm run build` bajaradi va `dist/` ni Caddy orqali (SPA fallback bilan, `/app/*`, `/admin/*`, `/me/*` marshrutlar ishlaydi) `PORT` da uzatadi. Alohida start-komanda kerak emas.

Dokploy'da:
- **Environment**: hozircha majburiy o‘zgaruvchi yo‘q (mock rejim). Backend chiqqanda: `VITE_DATA_SOURCE=http`, `VITE_API_URL=https://<backend>/api/v1` (Vite build-time o‘zgaruvchilar — o‘zgartirsangiz qayta build kerak).
- **Health check**: `GET /` (200).
- Git push → avtomatik deploy.
