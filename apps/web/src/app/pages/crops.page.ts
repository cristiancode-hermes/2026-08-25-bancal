import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Crop } from '../shared/models';

@Component({
  selector: 'app-crops',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="wrap section">
      <div class="section-head">
        <h1>Cultivos</h1>
        <div class="filters">
          <button class="chip" type="button" [class.on]="filter() === 'all'" (click)="setFilter('all')">Todos</button>
          <button class="chip" type="button" [class.on]="filter() === 'ripe'" (click)="setFilter('ripe')">Maduro hoy</button>
          <button class="chip" type="button" [class.on]="filter() === 'season'" (click)="setFilter('season')">Temporada</button>
        </div>
      </div>
      @if (loading()) {
        <div class="crop-grid">@for (i of [1,2,3,4]; track i) { <div class="skeleton card-skel"></div> }</div>
      } @else if (!crops().length) {
        <div class="empty">
          <p>Ningún cultivo coincide</p>
          <button class="btn btn-secondary" type="button" (click)="setFilter('all')">Limpiar filtro</button>
        </div>
      } @else {
        <div class="crop-grid">
          @for (c of crops(); track c.id) {
            <a class="crop-card" [routerLink]="['/cultivos', c.id]">
              <img [src]="c.photoUrl || '/assets/tomate.svg'" [alt]="c.name" width="640" height="480" />
              <div class="crop-meta">
                @if (c.isRipeToday) { <span class="badge">Maduro hoy</span> }
                <h3>{{ c.name }}</h3>
                <p class="price">{{ c.pricePerKg | number:'1.2-2' }} €/kg · {{ c.remainingKgToday }} kg hoy</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class CropsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly crops = signal<Crop[]>([]);
  readonly loading = signal(true);
  readonly filter = signal('all');

  ngOnInit() {
    this.load();
  }

  setFilter(f: string) {
    this.filter.set(f);
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.crops(this.filter()).subscribe({
      next: (rows) => {
        this.crops.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
