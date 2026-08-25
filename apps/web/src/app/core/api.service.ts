import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Addon, Booking, ConfirmResult, Crop, FieldDay, HarvestWindow } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  crops(filter = 'all') {
    return this.http.get<Crop[]>(`${API}/crops`, { params: { filter } });
  }
  crop(id: string) {
    return this.http.get<Crop>(`${API}/crops/${id}`);
  }
  today() {
    return this.http.get<FieldDay>(`${API}/field-days/today`);
  }
  windows(date?: string) {
    return this.http.get<HarvestWindow[]>(`${API}/windows`, date ? { params: { date } } : {});
  }
  addons() {
    return this.http.get<Addon[]>(`${API}/addons`);
  }
  hold(windowId: string, body: { partySize: number; lines: { cropId: string; kg: number }[]; addonIds?: string[] }) {
    return this.http.post<Booking>(`${API}/windows/${windowId}/hold`, body);
  }
  confirm(id: string) {
    return this.http.post<ConfirmResult>(`${API}/bookings/${id}/confirm`, {});
  }
  cancel(id: string) {
    return this.http.post<Booking>(`${API}/bookings/${id}/cancel`, {});
  }
  mine() {
    return this.http.get<Booking[]>(`${API}/bookings`);
  }
  booking(id: string) {
    return this.http.get<Booking>(`${API}/bookings/${id}`);
  }
  ticket(code: string) {
    return this.http.get<ConfirmResult>(`${API}/bookings/ticket/${code}`);
  }
  points() {
    return this.http.get<{ points: number }>(`${API}/me/points`);
  }
  review(id: string, body: { rating: number; comment?: string }) {
    return this.http.post(`${API}/bookings/${id}/reviews`, body);
  }
  checkIn(code: string) {
    return this.http.post<Booking>(`${API}/staff/check-in`, { code });
  }
  weigh(id: string, lines: { cropId: string; actualKg: number }[]) {
    return this.http.patch<Booking>(`${API}/staff/bookings/${id}/weigh`, { lines });
  }
  patchDay(date: string, body: { status?: string; note?: string }) {
    return this.http.patch<FieldDay>(`${API}/staff/field-days/${date}`, body);
  }
  stats() {
    return this.http.get<{ visitors: number; kgByCrop: { name: string; kg: number }[]; revenue: number }>(
      `${API}/stats/today`,
    );
  }
}
