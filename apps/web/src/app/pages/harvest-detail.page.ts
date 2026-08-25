import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-harvest-detail',
  imports: [RouterLink, DecimalPipe, FormsModule],
  template: `
    <div class="wrap section">
      @if (booking(); as b) {
        <p><a routerLink="/mis-cosechas">← Mis cosechas</a></p>
        <h1>{{ b.code }}</h1>
        <p>{{ b.statusLabel }} · {{ b.partySize }} visitantes</p>
        @if (qr()) { <div class="qr" [innerHTML]="qr()"></div> }
        <ul>
          @for (l of b.lines; track l.id) {
            <li>{{ l.crop?.name }} · {{ (l.actualKg ?? l.estimatedKg) }} kg · {{ l.amount | number:'1.2-2' }} €</li>
          }
        </ul>
        <p class="total">Total {{ b.total | number:'1.2-2' }} €</p>
        @if (b.status === 'pending' || b.status === 'confirmed') {
          <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        }
        @if (b.status === 'completed' && !b.review) {
          <form (ngSubmit)="review()">
            <label>Reseña 1–5
              <input type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set(+$event)" name="rating" />
            </label>
            <button class="btn btn-secondary" type="submit">Publicar</button>
          </form>
        }
        @if (error()) { <p class="form-error">{{ error() }}</p> }
      }
    </div>
  `,
})
export class HarvestDetailPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly booking = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly rating = signal(5);
  readonly error = signal('');

  ngOnInit() {
    this.reload();
  }

  reload() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.booking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
    });
  }

  cancel() {
    const b = this.booking();
    if (!b) return;
    this.api.cancel(b.id).subscribe({
      next: (row) => this.booking.set(row),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo cancelar'),
    });
  }

  review() {
    const b = this.booking();
    if (!b) return;
    this.api.review(b.id, { rating: this.rating() }).subscribe({
      next: () => this.reload(),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo reseñar'),
    });
  }
}
