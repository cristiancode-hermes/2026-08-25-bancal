# Bancal — Frontend

Angular 22 standalone + signals + `provideZonelessChangeDetection` + `withFetch()`.

## Rutas (orden)

1. `/login`, `/entrar`, `/registro` — centered card, creds demo **debajo**, inputs vacíos, `autocomplete=off` / `new-password`.
2. `/pase/:code` — ticket público, QR con `bypassSecurityTrustHtml`.
3. Shell `path: ''`:
   - `/` home (maduros + ventanas, mismo `freeSlots`)
   - `/cultivos`, `/cultivos/:id` (404 propio)
   - `/reservar` — picker cesta + extras + **total vivo antes del hold** + timer
   - `/confirmacion/:id` — QR real
   - `/mis-cosechas`, `/mis-cosechas/:id`
   - `/staff`
   - `**` not-found (último child)

## Token

`localStorage['bancal.jwt']`. El interceptor **lee solo storage**, nunca `inject(AuthService)`.

## Tema

Toggle sol/luna con `aria-label`. Persistencia `bancal.theme`. Tokens light/dark «Granada de Surco». Contraste-hover: `a:hover:not(.btn)` y `color: var(--color-on-primary)` en estados de `.btn-primary`.

## Fotos

SVG de cultivo en `/assets/*.svg` (tomate, higo, pimiento, calabacín, albahaca, judía, naranja, haba). No se reutilizan fotos de bolera/hielo/láser.
