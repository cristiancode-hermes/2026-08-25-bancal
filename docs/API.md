# Bancal — API

Base: `/api`. Auth Bearer JWT.

## Auth

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/auth/register` | public | `{ username, email, password }` | `{ accessToken, user }` |
| POST | `/api/auth/login` | public | `{ identifier\|login, password }` | `{ accessToken, user }` |
| GET | `/api/auth/me` | bearer | — | `{ user }` |
| POST | `/api/auth/logout` | bearer | — | `{ ok: true }` |

## Catálogo y día

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/crops?filter=all\|ripe\|season` | public | `isRipeToday`, `remainingKgToday` |
| GET | `/api/crops/:id` | public | 404 si no existe |
| GET | `/api/crops/:id/reviews` | public | `{ avg, items }` |
| GET | `/api/plots` | public | bancales + cultivos |
| GET | `/api/addons` | public | extras |
| GET | `/api/field-days/today` | public | estado + ventanas |
| GET | `/api/field-days?from&to` | public | calendario |
| GET | `/api/windows?date=` | public | `freeSlots` canónico |
| GET | `/api/windows/:id` | public | |

## Reservas

| Method | Path | Auth | Body | Notes |
|--------|------|------|------|-------|
| POST | `/api/windows/:id/hold` | bearer | `{ partySize, lines:[{cropId,kg}], addonIds }` | 15 min |
| GET | `/api/bookings` | bearer | — | totales = SUM lines |
| GET | `/api/bookings/:id` | bearer | — | propio |
| POST | `/api/bookings/:id/confirm` | bearer | `{ paymentRef? }` | `{ booking, qrSvg, qrUrl }` |
| POST | `/api/bookings/:id/cancel` | bearer | — | 409 TOO_LATE <24h |
| GET | `/api/bookings/ticket/:code` | public | — | pase 200 |
| GET | `/api/me/points` | bearer | — | 12 × completed partySize |
| POST | `/api/bookings/:id/reviews` | bearer | `{ rating, comment? }` | solo completed |

## Staff

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/staff/check-in` | staff | `{ code }` código o URL |
| PATCH | `/api/staff/bookings/:id/weigh` | staff | `{ lines:[{cropId,actualKg}] }` |
| PATCH | `/api/staff/field-days/:date` | staff | `{ status, note }` |
| GET | `/api/stats/today` | staff | visitors, kgByCrop, revenue |
| GET | `/api/health` | public | `{ ok, service }` |

## 409 codes

`ALREADY_HELD` · `ALREADY_BOOKED` · `FIELD_CLOSED` · `WINDOW_FULL` · `INSUFFICIENT_KG` · `ALREADY_CHECKED_IN` · `TOO_LATE` · `NOT_CONFIRMABLE` · `NOT_RIPE` · `WINDOW_PAST`
