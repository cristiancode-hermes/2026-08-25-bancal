import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="wrap header-inner">
        <a routerLink="/" class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          Bancal
        </a>
        <button class="nav-toggle" type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-label="Menú">
          <span></span><span></span>
        </button>
        <nav class="nav" [class.open]="open()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="open.set(false)">Hoy</a>
          <a routerLink="/cultivos" routerLinkActive="active" (click)="open.set(false)">Cultivos</a>
          <a routerLink="/reservar" routerLinkActive="active" (click)="open.set(false)">Reservar</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/mis-cosechas" routerLinkActive="active" (click)="open.set(false)">Mis cosechas</a>
          }
          @if (auth.isStaff()) {
            <a routerLink="/staff" routerLinkActive="active" (click)="open.set(false)">Cancela</a>
          }
        </nav>
        <div class="header-actions">
          <button class="theme-toggle" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'">
            @if (theme.isDark()) {
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></g></svg>
            } @else {
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>
            }
          </button>
          @if (auth.user(); as u) {
            <span class="who">{{ u.username }} · {{ u.points }} pts</span>
            <button class="btn btn-ghost" type="button" (click)="auth.logout()">Salir</button>
          } @else {
            <a class="btn btn-primary" routerLink="/login">Entrar</a>
          }
        </div>
      </div>
    </header>
    <main class="site-main">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <div class="wrap">El huerto no se inventa. Se madura.</div>
    </footer>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly open = signal(false);
}
