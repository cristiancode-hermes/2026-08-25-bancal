import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-screen">
      <div class="auth-card">
        <p class="brand-kicker">Bancal</p>
        <h1>Entra al huerto</h1>
        <p class="lede">Username o email. El pase viaja en el móvil.</p>
        <form (ngSubmit)="submit()">
          <label for="identifier">Usuario o email</label>
          <input id="identifier" name="identifier" type="text" autocomplete="off"
            [ngModel]="identifier()" (ngModelChange)="identifier.set($event)" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" />
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
        <p class="auth-alt">¿Primera visita? <a routerLink="/registro">Crea cuenta</a></p>
      </div>
      <div class="auth-demo">
        <p>Cuenta de prueba con datos</p>
        <code>huerta</code> o <code>huerta&#64;bancal.test</code>
        <code>Bancal2026!</code>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly identifier = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (!this.identifier() || !this.password()) {
      this.error.set('Escribe usuario y contraseña');
      return;
    }
    this.auth.login({ identifier: this.identifier(), password: this.password() }).subscribe({
      next: () => {
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => this.error.set(err?.error?.message || 'Credenciales inválidas'),
    });
  }
}
