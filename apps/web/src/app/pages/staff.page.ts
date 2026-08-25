import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { Booking, FieldDay } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <div class="wrap section">
      <h1>Cancela</h1>
      <form (ngSubmit)="scan()">
        <label>Código o URL
          <input type="text" autocomplete="off" [ngModel]="code()" (ngModelChange)="code.set($event)" name="code" />
        </label>
        <button class="btn btn-primary" type="submit">Check-in</button>
      </form>
      @if (last(); as b) {
        <p>Último: {{ b.code }} → {{ b.statusLabel }}</p>
        @if (b.status === 'checked_in') {
          <button class="btn btn-secondary" type="button" (click)="weigh(b)">Cerrar con kg estimados</button>
        }
      }
      @if (day(); as d) {
        <h2>Día de campo {{ d.date }}</h2>
        <p>{{ d.status }} — {{ d.note }}</p>
        <div class="filters">
          <button class="chip" type="button" (click)="setStatus('open')">Abrir</button>
          <button class="chip" type="button" (click)="setStatus('limited')">Limitar</button>
          <button class="chip" type="button" (click)="setStatus('closed')">Cerrar</button>
        </div>
      }
      @if (stats(); as s) {
        <p>{{ s.visitors }} visitantes · {{ s.revenue }} €</p>
      }
      @if (error()) { <p class="form-error">{{ error() }}</p> }
    </div>
  `,
})
export class StaffPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly code = signal('');
  readonly last = signal<Booking | null>(null);
  readonly day = signal<FieldDay | null>(null);
  readonly stats = signal<{ visitors: number; revenue: number } | null>(null);
  readonly error = signal('');

  ngOnInit() {
    this.api.today().subscribe({ next: (d) => this.day.set(d) });
    this.api.stats().subscribe({ next: (s) => this.stats.set(s) });
  }

  scan() {
    this.error.set('');
    this.api.checkIn(this.code()).subscribe({
      next: (b) => this.last.set(b),
      error: (err) => this.error.set(err?.error?.message || 'Check-in fallido'),
    });
  }

  weigh(b: Booking) {
    const lines = (b.lines || []).map((l) => ({ cropId: l.cropId, actualKg: l.estimatedKg }));
    this.api.weigh(b.id, lines).subscribe({
      next: (row) => this.last.set(row),
      error: (err) => this.error.set(err?.error?.message || 'Peso fallido'),
    });
  }

  setStatus(status: string) {
    const d = this.day();
    if (!d) return;
    this.api.patchDay(d.date, { status }).subscribe({ next: (row) => this.day.set(row) });
  }
}
