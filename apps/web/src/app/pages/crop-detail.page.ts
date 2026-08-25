import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MONTHS, type Crop } from '../shared/models';

@Component({
  selector: 'app-crop-detail',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="wrap section">
      @if (missing()) {
        <div class="empty">
          <h1>Cultivo no encontrado</h1>
          <a class="btn btn-primary" routerLink="/cultivos">Volver al catálogo</a>
        </div>
      } @else if (crop(); as c) {
        <article class="detail">
          <img class="detail-photo" [src]="c.photoUrl || '/assets/tomate.svg'" [alt]="c.name" />
          <div>
            @if (c.isRipeToday) { <span class="badge">Maduro hoy</span> }
            <h1>{{ c.name }}</h1>
            <p class="lede">{{ c.description }}</p>
            <p class="price">{{ c.pricePerKg | number:'1.2-2' }} €/kg</p>
            <p>{{ c.remainingKgToday }} kg restantes hoy (cupo {{ c.dailyKg }} kg)</p>
            <p class="muted">Temporada: {{ months(c.ripeMonths) }}</p>
            <a class="btn btn-primary" routerLink="/reservar" [class.is-disabled]="!c.isRipeToday">Añadir a la cesta</a>
          </div>
        </article>
      }
    </div>
  `,
})
export class CropDetailPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly crop = signal<Crop | null>(null);
  readonly missing = signal(false);
  readonly MONTHS = MONTHS;

  months(list: number[]) {
    return list.map((m) => MONTHS[m]).join(', ');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.crop(id).subscribe({
      next: (c) => this.crop.set(c),
      error: () => this.missing.set(true),
    });
  }
}
