import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-pase',
  imports: [RouterLink],
  template: `
    <div class="auth-screen">
      @if (missing()) {
        <div class="empty">
          <h1>Pase no encontrado</h1>
          <a class="btn btn-primary" routerLink="/">Volver al huerto</a>
        </div>
      } @else if (booking(); as b) {
        <article class="ticket">
          <p class="brand-kicker">Bancal</p>
          <h1>{{ b.code }}</h1>
          @if (qr()) { <div class="qr" [innerHTML]="qr()"></div> }
          <p>{{ b.statusLabel }} · {{ b.partySize }} visitantes</p>
          <p class="total">{{ b.total }} €</p>
        </article>
      }
    </div>
  `,
})
export class PasePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly booking = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly missing = signal(false);

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.ticket(code).subscribe({
      next: (res) => {
        this.booking.set(res.booking);
        if (res.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(res.qrSvg));
      },
      error: () => this.missing.set(true),
    });
  }
}
