# Bancal — Architecture

Huerto de recolecta (U-pick) B2C. El visitante ve **qué está maduro hoy**, reserva **mañana (09–12) o tarde (16–19)**, arma una **cesta con kg**, retiene 15 min y confirma un **pase QR real**. El staff escanea la cancela y pesa los kg reales.

## Stack

- **apps/web** — Angular 22, standalone, signals, zoneless, CSS propio (paleta «Granada de Surco»).
- **apps/api** — NestJS 11, TypeORM, better-sqlite3 (dev) / Postgres Neon-ready.
- Puerto API: **3074**. Prefijo `/api`. JWT via `ConfigService` (no `process.env` al load del módulo).

## Capa de valor

1. **Motor de madurez** — `ripeMonths` + mes Europe/Madrid. Fuera de temporada no entra en el picker.
2. **FieldDay** — open / limited / closed. `FIELD_CLOSED` → 409.
3. **Cesta + kg** — líneas de verdad (`BookingLine`). Totales lista = detalle = `SUM(amount)`.
4. **Aforo compartido** por ventana (24) + cupo kg por cultivo. No es mutex 1:1 de sala.

## Transacción

- Hold `pending` con `expiresAt` **servidor** (15 min).
- Sweeper `setInterval(30s)` → `expireStale()`.
- Mutex in-process + re-check (SQLite no soporta `FOR UPDATE`; en Postgres se puede activar).
- 409: `ALREADY_HELD`, `ALREADY_BOOKED`, `FIELD_CLOSED`, `WINDOW_FULL`, `INSUFFICIENT_KG`, `ALREADY_CHECKED_IN`, `TOO_LATE`, `NOT_RIPE`.
- QR: `qrcode` SVG, payload = `WEB_ORIGIN/pase/:code`.
- Puntos = 12 × `partySize` de bookings `completed` (recalculados, no seed arbitrario).

## Auth

- Login `identifier` **o** `login` (username o email).
- Token `bancal.jwt` en localStorage. Interceptor **no** inyecta AuthService.
- Rutas `/login`, `/entrar`, `/registro`, `/pase/:code` **antes** del shell `**`.

## Demo

- Visitante: `huerta` / `huerta@bancal.test` / `Bancal2026!`
- Staff: `hortelano` / `hortelano@bancal.test` / `Bancal2026!`

## Decision Record

- QR real: sí | url: `/pase/:code`
- Login layout: centered card
- Tipo: B2C cliente final
- Puerto: 3074
