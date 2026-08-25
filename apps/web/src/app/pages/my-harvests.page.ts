import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-my-harvests',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="wrap section">
      <h1>Mis cosechas</h1>
      @if (!rows().length && !loading()) {
        <div class="empty">
          <p>Aún no has reservado</p>
          <a class="btn btn-primary" routerLink="/reservar">Reservar</a>
        </div>
      }
      <ul class="harvest-list">
        @for (b of rows(); track b.id) {
          <li>
            <a [routerLink]="['/mis-cosechas', b.id]">
              <strong>{{ b.code }}</strong>
              <span>{{ b.statusLabel }}</span>
              <span>{{ b.total | number:'1.2-2' }} €</span>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class MyHarvestsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly rows = signal<Booking[]>([]);
  readonly loading = signal(true);

  ngOnInit() {
    this.api.mine().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
