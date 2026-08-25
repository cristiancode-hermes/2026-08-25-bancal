import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'pase/:code',
    loadComponent: () => import('./pages/pase.page').then((m) => m.PasePageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'cultivos',
        loadComponent: () => import('./pages/crops.page').then((m) => m.CropsPageComponent),
      },
      {
        path: 'cultivos/:id',
        loadComponent: () => import('./pages/crop-detail.page').then((m) => m.CropDetailPageComponent),
      },
      {
        path: 'reservar',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'confirmacion/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/confirmation.page').then((m) => m.ConfirmationPageComponent),
      },
      {
        path: 'mis-cosechas',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/my-harvests.page').then((m) => m.MyHarvestsPageComponent),
      },
      {
        path: 'mis-cosechas/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/harvest-detail.page').then((m) => m.HarvestDetailPageComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent),
      },
    ],
  },
];
