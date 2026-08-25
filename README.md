# Bancal

Huerto de recolecta (U-pick). El visitante ve qué está maduro hoy, reserva mañana o tarde, arma la cesta y entra con un pase QR real.

- Demo: `huerta` / `huerta@bancal.test` / `Bancal2026!`
- Staff: `hortelano` / `hortelano@bancal.test` / `Bancal2026!`
- API: puerto 3074 (`PORT=3074`)
- Docs: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/FRONTEND.md`

```
cd apps/api && npm run build && PORT=3074 SEED_DB=true node dist/main.js
cd apps/web && npm run build
```
