import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import type { Crop, FieldDay, HarvestWindow } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="brand-kicker">Huerto de recolecta</p>
          <h1>Lo que está maduro hoy, pase en la cancela.</h1>
          <p class="lede">Mañana 09–12 o tarde 16–19. Armas la cesta, retienes 15 minutos y entras con QR.</p>
          @if (day(); as d) {
            <p class="weather">{{ d.note }}</p>
            @if (d.status === 'closed') {
              <p class="banner">Hoy el huerto descansa. {{ d.note }}</p>
            }
          }
        </div>
        <div class="window-row">
          @if (loading()) {
            <div class="skeleton chip-skel"></div>
            <div class="skeleton chip-skel"></div>
          } @else {
            @for (w of windows(); track w.id) {
              <button class="window-chip" type="button" [disabled]="w.passed || w.freeSlots <= 0 || closed()"
                [routerLink]="closed() ? null : '/reservar'" [queryParams]="closed() ? null : { window: w.id }">
                <span class="w-label">{{ w.label }}</span>
                <span class="w-hours">{{ w.startTime }}–{{ w.endTime }}</span>
                <span class="w-state">{{ w.statusLabel }} · {{ w.freeSlots }} huecos hoy</span>
              </button>
            }
          }
        </div>
      </div>
    </section>
    <section class="wrap section">
      <div class="section-head">
        <h2>Maduro hoy</h2>
        <a routerLink="/cultivos">Ver todos</a>
      </div>
      @if (loading()) {
        <div class="crop-grid">
          @for (i of [1,2,3,4]; track i) { <div class="skeleton card-skel"></div> }
        </div>
      } @else if (!ripe().length) {
        <div class="empty">
          <p>Hoy el huerto descansa</p>
          <a class="btn btn-secondary" routerLink="/cultivos">Ver temporada</a>
        </div>
      } @else {
        <div class="crop-grid">
          @for (c of ripe(); track c.id) {
            <a class="crop-card" [routerLink]="['/cultivos', c.id]">
              <img [src]="c.photoUrl || '/assets/tomate.svg'" [alt]="c.name" width="640" height="480" />
              <div class="crop-meta">
                <span class="badge">Maduro hoy</span>
                <h3>{{ c.name }}</h3>
                <p class="price">{{ c.pricePerKg | number:'1.2-2' }} €/kg · {{ c.remainingKgToday }} kg</p>
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly day = signal<FieldDay | null>(null);
  readonly windows = signal<HarvestWindow[]>([]);
  readonly ripe = signal<Crop[]>([]);
  readonly closed = () => this.day()?.status === 'closed';

  ngOnInit() {
    forkJoin({
      day: this.api.today(),
      windows: this.api.windows(),
      crops: this.api.crops('ripe'),
    }).subscribe({
      next: (res) => {
        this.day.set(res.day);
        this.windows.set(res.windows);
        this.ripe.set(res.crops);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
