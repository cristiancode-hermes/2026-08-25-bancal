# QA Report — 2026-08-25 Bancal

**Project:** Huerto de recolecta (U-pick) B2C — madurez + FieldDay + cesta + pase QR real
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + SQLite
**Author:** Hermes Daily Builder
**QA:** qa-tester-deployer cron 2026-08-25

## Decision Record

QR real: sí | url: /pase/:code
Últimos fullstack con QR: Témpano, Sextante, Bancal

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `dist/main.js` | ✅ | Ya compilado por el builder; Jest + smoke contra el binario vivo |
| Web `dist/web/browser/index.html` | ✅ | `baseHref: /`, título Bancal |
| `isFinalDesign` | DESIGN_FREE | Proyecto 100 % nuevo |

## ✅ 2. Test Results

19/19 Jest (`apps/api/src/bancal.spec.ts`) — ALL PASSED

| Suite | Result |
|-------|--------|
| bancal.spec.ts | 19 passed |

## ✅ 3. Binary / Runtime Verification

API viva en `:3074` (`{"ok":true,"service":"bancal"}`).

Endpoint smoke (`scripts/qa-endpoint-test.sh`, luego eliminado): **29/29 PASS**

| Check | Status |
|-------|--------|
| Health / crops / windows / addons / plots / today | 200 |
| Register + login email + login username | 201 + `accessToken` |
| Demo `huerta` / staff `hortelano` | 201 |
| `/auth/me` token / sin token | 200 / 401 |
| Hold + confirm + ticket público | 201 / 201 / 200 |
| Same-user segundo hold | 409 |
| Staff check-in + segundo scan | 201 / 409 |
| FIELD_CLOSED hold (2026-08-28) | 409 `FIELD_CLOSED` |
| Lista ↔ detalle demo | 18.8 == 18.8 |
| Puntos derivados | 24 = 12 × partySize completed |
| QR `qrSvg` contiene `qrUrl` `/pase/BNCL-…` | PASS |

Browser (Puppeteer live): home, login (inputs vacíos + creds demo debajo), registro, catálogo, `/cultivos/:id` Albahaca (no blanco), `/pase/BNCL-SEED` con QR, mobile 390 sin overflow. 0 errores de consola.

Captura prod: `bancal.png` 88 KB + `bancal-m.png` 49 KB — UI real, sesión `huerta · 24 pts`.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor | PASS | Motor de madurez + FieldDay + cupo kg |
| Ciclo B2C | PASS | expiresAt servidor, sweeper, 409 aforo/kg/same-user, QR, check-in |
| Auth username OR email | PASS | |
| Auth ANTES del `**` | PASS | `/login` `/entrar` `/registro` `/pase/:code` top-level |
| Demo creds debajo, inputs vacíos | PASS | |
| Theme toggle sol/luna + aria-label | PASS | |
| Fotos vertical (huerto/fruta) | PASS | SVG de cultivo, no gym/hielo |
| Totales lista ↔ detalle | PASS | |
| Rutas dinámicas | PASS | cultivo + pase |
| Gráficos | N/A | Staff muestra KPIs numéricos, no chart |
| contraste-hover | PASS | `a:hover:not(.btn)` + on-primary en hover/focus/active |
| Contraste AA light+dark | PASS | primary 9.21 / hover 12.21; dark 5.89 / 9.21; accent 9.32 / 5.01 |
| TOKEN_KEY namespaced | `bancal.jwt` | Añadido a ambos bloques de prod-capture |

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| Register 400 en capture (usuario seed ya existe) | info | El login demo cubre el flujo; 409/400 esperado |
| manage-apis tenía 3074 sin NAMES/DIRS | fixed | Alineado 59/59/59 |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| Interceptor `***` | 0 matches |
| JWT en localStorage, no AuthService inject | PASS |
| `APP_GUARD` global | ausente (correcto) |
| Login/register públicos | PASS |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `bancal.proyectos.cristiancode.dev` → dist + `/api*` :3074 |
| API | ✅ | :3074, manage-apis alineado |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-25-bancal |
| README | ✅ | link2 200 |
| Landing | ✅ | `name:'bancal'` en proyectos.cristiancode.dev |
| Excel | ✅ | Fila 91 / #90 Completado |
| Portfolio es/en/pt | ✅ | slug `bancal`, heading-223, date 2026-08-25 |
| Capture config | ✅ | demo `huerta@bancal.test` / `Bancal2026!` |
| Screenshots | ✅ | public/assets/bancal.png + -m.png |

### Link check

| Link | HTTP |
|------|------|
| href https://bancal.proyectos.cristiancode.dev | 200 |
| /login /entrar /cultivos /pase/:code | 200 |
| /api/health | 200 |
| link2 README | 200 |
| link3 repo | 200 |

## Summary

**OVERALL: PASS ✅**

Published: ✅ Caddy (bancal.proyectos.cristiancode.dev :3074), ✅ Portfolio (es.ts+en.ts+pt.ts), ✅ Landing, ✅ GitHub
