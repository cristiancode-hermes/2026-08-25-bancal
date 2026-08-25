import { DecimalPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import type { Addon, Booking, Crop, HarvestWindow } from '../shared/models';

interface PickLine {
  cropId: string;
  name: string;
  price: number;
  kg: number;
  selected: boolean;
}

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="wrap section checkout">
      <h1>Reservar recolecta</h1>
      <p class="lede">Elige ventana, arma la cesta y mira el total antes de retener.</p>

      <h2>Ventana</h2>
      <div class="window-row">
        @for (w of windows(); track w.id) {
          <button class="window-chip" type="button"
            [class.on]="selectedWindow() === w.id"
            [disabled]="w.passed || w.freeSlots <= 0 || closed()"
            (click)="selectedWindow.set(w.id)">
            <span class="w-label">{{ w.label }}</span>
            <span class="w-hours">{{ w.startTime }}–{{ w.endTime }}</span>
            <span class="w-state">{{ w.statusLabel }} · {{ w.freeSlots }} huecos hoy</span>
          </button>
        }
      </div>

      <label class="party">
        Visitantes
        <input type="number" min="1" max="6" [ngModel]="party()" (ngModelChange)="party.set(+$event)" />
      </label>

      <h2>Cesta</h2>
      <div class="crate">
        @for (line of picks(); track line.cropId) {
          <label class="crate-row">
            <input type="checkbox" [checked]="line.selected" (change)="toggle(line.cropId)" />
            <span>{{ line.name }} · {{ line.price | number:'1.2-2' }} €/kg</span>
            <input type="number" min="0.5" max="10" step="0.5" [disabled]="!line.selected"
              [ngModel]="line.kg" (ngModelChange)="setKg(line.cropId, +$event)" />
          </label>
        }
      </div>

      <h2>Extras</h2>
      <div class="crate">
        @for (a of addons(); track a.id) {
          <label class="crate-row">
            <input type="checkbox" [checked]="addonOn().includes(a.id)" (change)="toggleAddon(a.id)" />
            <span>{{ a.name }} · {{ a.price | number:'1.2-2' }} €</span>
          </label>
        }
      </div>

      <aside class="summary">
        <h2>Resumen</h2>
        @for (l of selectedLines(); track l.cropId) {
          <p>{{ l.name }} · {{ l.kg }} kg · {{ (l.kg * l.price) | number:'1.2-2' }} €</p>
        }
        @for (a of selectedAddons(); track a.id) {
          <p>{{ a.name }} · {{ a.price | number:'1.2-2' }} €</p>
        }
        <p class="total">Total {{ liveTotal() | number:'1.2-2' }} €</p>
        @if (hold(); as h) {
          <p class="timer">Retención {{ mmss() }}</p>
          <button class="btn btn-primary" type="button" (click)="pay()">Confirmar y pagar</button>
        } @else {
          <button class="btn btn-primary" type="button" [disabled]="!canHold()" (click)="retain()">Retener 15 min</button>
        }
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      </aside>
    </div>
  `,
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly windows = signal<HarvestWindow[]>([]);
  readonly addons = signal<Addon[]>([]);
  readonly picks = signal<PickLine[]>([]);
  readonly selectedWindow = signal('');
  readonly party = signal(2);
  readonly addonOn = signal<string[]>([]);
  readonly hold = signal<Booking | null>(null);
  readonly error = signal('');
  readonly closed = signal(false);
  readonly now = signal(Date.now());
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly selectedLines = computed(() => this.picks().filter((p) => p.selected));
  readonly selectedAddons = computed(() => this.addons().filter((a) => this.addonOn().includes(a.id)));
  readonly liveTotal = computed(() => {
    const lines = this.selectedLines().reduce((a, l) => a + l.kg * l.price, 0);
    const extras = this.selectedAddons().reduce((a, x) => a + x.price, 0);
    return Math.round((lines + extras) * 100) / 100;
  });
  readonly canHold = computed(
    () => !!this.selectedWindow() && this.selectedLines().length > 0 && !this.closed(),
  );
  readonly mmss = computed(() => {
    const h = this.hold();
    if (!h?.expiresAt) return '00:00';
    const left = Math.max(0, new Date(h.expiresAt).getTime() - this.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  ngOnInit() {
    this.tick = setInterval(() => this.now.set(Date.now()), 1000);
    forkJoin({
      windows: this.api.windows(),
      crops: this.api.crops('ripe'),
      addons: this.api.addons(),
      today: this.api.today(),
    }).subscribe({
      next: (res) => {
        this.windows.set(res.windows);
        this.closed.set(res.today.status === 'closed');
        this.addons.set(res.addons);
        this.picks.set(
          res.crops
            .filter((c: Crop) => c.isRipeToday && c.remainingKgToday > 0)
            .map((c: Crop) => ({
              cropId: c.id,
              name: c.name,
              price: c.pricePerKg,
              kg: 1,
              selected: false,
            })),
        );
        const q = this.route.snapshot.queryParamMap.get('window');
        if (q) this.selectedWindow.set(q);
        else if (res.windows[0]) this.selectedWindow.set(res.windows[0].id);
      },
    });
  }

  ngOnDestroy() {
    if (this.tick) clearInterval(this.tick);
  }

  @HostListener('document:visibilitychange')
  resync() {
    this.now.set(Date.now());
  }

  toggle(id: string) {
    this.picks.update((rows) => rows.map((r) => (r.cropId === id ? { ...r, selected: !r.selected } : r)));
  }
  setKg(id: string, kg: number) {
    this.picks.update((rows) => rows.map((r) => (r.cropId === id ? { ...r, kg } : r)));
  }
  toggleAddon(id: string) {
    this.addonOn.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  retain() {
    this.error.set('');
    this.api
      .hold(this.selectedWindow(), {
        partySize: this.party(),
        lines: this.selectedLines().map((l) => ({ cropId: l.cropId, kg: l.kg })),
        addonIds: this.addonOn(),
      })
      .subscribe({
        next: (b) => this.hold.set(b),
        error: (err) => this.error.set(err?.error?.message || err?.error?.code || 'No se pudo retener'),
      });
  }

  pay() {
    const h = this.hold();
    if (!h) return;
    this.api.confirm(h.id).subscribe({
      next: () => void this.router.navigate(['/confirmacion', h.id]),
      error: (err) => this.error.set(err?.error?.message || 'Pago no disponible'),
    });
  }
}
