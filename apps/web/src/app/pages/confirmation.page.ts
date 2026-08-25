import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-confirmation',
  imports: [RouterLink],
  template: `
    <div class="wrap section ticket-page">
      <h1>Pase listo</h1>
      @if (booking(); as b) {
        <article class="ticket">
          <p class="code">{{ b.code }}</p>
          @if (qr()) {
            <div class="qr" [innerHTML]="qr()"></div>
          }
          <p><a [href]="b.qrUrl || '#'">{{ b.qrUrl }}</a></p>
          <p>{{ b.statusLabel }} · {{ b.partySize }} visitantes · {{ b.total }} €</p>
          <a class="btn btn-secondary" [routerLink]="['/mis-cosechas', b.id]">Ver detalle</a>
        </article>
      }
    </div>
  `,
})
export class ConfirmationPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly booking = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.booking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
    });
  }
}
