import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap section empty">
      <h1>Senda no encontrada</h1>
      <a class="btn btn-primary" routerLink="/">Volver al huerto</a>
    </div>
  `,
})
export class NotFoundPageComponent {}
