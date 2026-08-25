import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Addon,
  Booking,
  BookingAddon,
  BookingLine,
  CrateEntry,
  Crop,
  EmailLog,
  FieldDay,
  HarvestWindow,
  Plot,
  PlotCrop,
  Review,
  User,
} from '../entities/entities';
import { addMadridDays, hoursUntilWindowStart, madridMonth, madridToday, windowHasPassed } from '../common/time';
import { buildPaseQrSvg, extractTicketCode, makeCode, paseUrl } from '../common/qr';
import { withLock } from '../common/mutex';
import { lineAmount, money } from '../common/money';

const LIVE = ['pending', 'confirmed', 'checked_in'] as const;
const KG_CONSUMING = ['pending', 'confirmed', 'checked_in', 'completed'] as const;
const POINTS_PER_VISITOR = 12;
const HOLD_MS = 15 * 60 * 1000;

function conflict(code: string, message: string): never {
  throw new ConflictException({ code, message: `${code}: ${message}` });
}

@Injectable()
export class HarvestService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(PlotCrop) private readonly plotCrops: Repository<PlotCrop>,
    @InjectRepository(FieldDay) private readonly days: Repository<FieldDay>,
    @InjectRepository(HarvestWindow) private readonly windows: Repository<HarvestWindow>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(CrateEntry) private readonly crate: Repository<CrateEntry>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(BookingAddon) private readonly bookingAddons: Repository<BookingAddon>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStale().catch(() => undefined);
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  isRipe(crop: Crop, month = madridMonth()): boolean {
    return Array.isArray(crop.ripeMonths) && crop.ripeMonths.includes(month);
  }

  async remainingKg(cropId: string, date: string, excludeBookingId?: string): Promise<number> {
    const crop = await this.crops.findOne({ where: { id: cropId } });
    if (!crop) return 0;
    const day = await this.days.findOne({ where: { date } });
    if (!day) return crop.dailyKg;
    const bookings = await this.bookings.find({
      where: { fieldDayId: day.id, status: In([...KG_CONSUMING]) },
    });
    const live = bookings.filter((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.status === 'pending' && b.expiresAt && b.expiresAt.getTime() < Date.now()) return false;
      return true;
    });
    const ids = live.map((b) => b.id);
    if (!ids.length) return crop.dailyKg;
    const rows = await this.lines.find({ where: { bookingId: In(ids), cropId } });
    const used = rows.reduce((acc, r) => acc + (r.actualKg ?? r.estimatedKg), 0);
    return money(Math.max(0, crop.dailyKg - used));
  }

  async decorateCrop(crop: Crop, date = madridToday()) {
    const remainingKgToday = await this.remainingKg(crop.id, date);
    return {
      ...crop,
      isRipeToday: this.isRipe(crop),
      remainingKgToday,
      pricePerKg: money(crop.pricePerKg),
    };
  }

  async listCrops(filter?: string) {
    const all = await this.crops.find({ where: { isActive: true }, order: { name: 'ASC' } });
    const month = madridMonth();
    const decorated = [];
    for (const c of all) decorated.push(await this.decorateCrop(c));
    const f = (filter || 'all').toLowerCase();
    if (f === 'ripe' || f === 'today') return decorated.filter((c) => c.isRipeToday);
    if (f === 'season') return decorated.filter((c) => c.ripeMonths.includes(month));
    return decorated;
  }

  async getCrop(id: string) {
    const crop = await this.crops.findOne({ where: { id } });
    if (!crop) throw new NotFoundException('Cultivo no encontrado');
    const plots = await this.plotCrops.find({ where: { cropId: id }, relations: { plot: true } });
    const reviews = await this.reviews.find({ where: { cropId: id }, order: { createdAt: 'DESC' } });
    const avg = reviews.length ? money(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) : 0;
    return {
      ...(await this.decorateCrop(crop)),
      plots: plots.map((p) => p.plot),
      reviews: { avg, items: reviews },
    };
  }

  async listPlots() {
    const plots = await this.plots.find({ order: { name: 'ASC' } });
    const links = await this.plotCrops.find({ relations: { crop: true } });
    return plots.map((p) => ({
      ...p,
      crops: links.filter((l) => l.plotId === p.id).map((l) => l.crop),
    }));
  }

  async listAddons() {
    return this.addons.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async serializeWindow(w: HarvestWindow, date: string) {
    await this.syncReserved(w);
    const freeSlots = Math.max(0, w.capacity - w.reservedCount);
    const passed = windowHasPassed(date, w.endTime);
    return {
      ...w,
      date,
      freeSlots,
      label: w.startTime === '09:00' ? 'Mañana' : 'Tarde',
      statusLabel: passed ? 'Pasada' : freeSlots <= 0 ? 'Completa' : 'Libre',
      passed,
    };
  }

  async listWindows(date?: string) {
    const d = date || madridToday();
    const day = await this.ensureDay(d);
    const wins = await this.windows.find({ where: { fieldDayId: day.id }, order: { startTime: 'ASC' } });
    const items = [];
    for (const w of wins) items.push(await this.serializeWindow(w, d));
    return items;
  }

  async getWindow(id: string) {
    const w = await this.windows.findOne({ where: { id }, relations: { fieldDay: true } });
    if (!w) throw new NotFoundException('Ventana no encontrada');
    return this.serializeWindow(w, w.fieldDay!.date);
  }

  async todayFieldDay() {
    const date = madridToday();
    const day = await this.ensureDay(date);
    const windows = await this.listWindows(date);
    return { ...day, windows, date };
  }

  async listFieldDays(from?: string, to?: string) {
    const start = from || addMadridDays(madridToday(), -2);
    const end = to || addMadridDays(madridToday(), 10);
    const rows = await this.days.find({ order: { date: 'ASC' } });
    return rows.filter((r) => r.date >= start && r.date <= end);
  }

  async ensureDay(date: string): Promise<FieldDay> {
    let day = await this.days.findOne({ where: { date } });
    if (day) return day;
    day = (await this.days.save({
      date,
      status: 'open',
      note: null,
      maxVisitors: 48,
    } as any)) as FieldDay;
    for (const spec of [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '16:00', endTime: '19:00' },
    ]) {
      await this.windows.save({
        fieldDayId: day.id,
        startTime: spec.startTime,
        endTime: spec.endTime,
        capacity: 24,
        reservedCount: 0,
      } as any);
    }
    return day;
  }

  async syncReserved(w: HarvestWindow) {
    const rows = await this.bookings.find({ where: { windowId: w.id, status: In([...LIVE]) } });
    const live = rows.filter((b) => !(b.status === 'pending' && b.expiresAt && b.expiresAt.getTime() < Date.now()));
    const count = live.reduce((a, b) => a + b.partySize, 0);
    if (count !== w.reservedCount) {
      w.reservedCount = count;
      await this.windows.save(w as any);
    }
  }

  bookingTotal(booking: Booking): number {
    const lineSum = (booking.lines || []).reduce((a, l) => a + money(l.amount), 0);
    const addonSum = (booking.addons || []).reduce((a, ba) => a + money((ba.addon?.price || 0) * ba.qty), 0);
    return money(lineSum + addonSum);
  }

  async loadBooking(id: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: {
        lines: { crop: true },
        crate: { crop: true },
        addons: { addon: true },
        window: true,
        fieldDay: true,
        review: true,
      },
    });
    if (!booking) throw new NotFoundException('Cosecha no encontrada');
    return this.serializeBooking(booking);
  }

  serializeBooking(booking: Booking) {
    const total = this.bookingTotal(booking);
    return {
      ...booking,
      total,
      statusLabel: this.statusLabel(booking.status),
    };
  }

  statusLabel(s: string) {
    const map: Record<string, string> = {
      pending: 'Reservada',
      confirmed: 'Comprada',
      checked_in: 'En el huerto',
      completed: 'Completada',
      cancelled: 'Cancelada',
      expired: 'Caducada',
    };
    return map[s] || s;
  }

  async mine(userId: string) {
    await this.expireStale();
    const rows = await this.bookings.find({
      where: { userId },
      relations: {
        lines: { crop: true },
        crate: { crop: true },
        addons: { addon: true },
        window: true,
        fieldDay: true,
        review: true,
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((b) => this.serializeBooking(b));
  }

  async getMine(userId: string, id: string) {
    const booking = await this.loadBooking(id);
    if (booking.userId !== userId) throw new NotFoundException('Cosecha no encontrada');
    return booking;
  }

  async publicTicket(code: string) {
    const extracted = extractTicketCode(code);
    const booking = await this.bookings.findOne({
      where: { code: extracted },
      relations: {
        lines: { crop: true },
        crate: { crop: true },
        addons: { addon: true },
        window: true,
        fieldDay: true,
      },
    });
    if (!booking) throw new NotFoundException('Pase no encontrado');
    return {
      booking: this.serializeBooking(booking),
      qrSvg: booking.qrSvg,
      qrUrl: booking.qrUrl,
    };
  }

  async points(userId: string) {
    const pts = await this.recomputePoints(userId);
    return { points: pts };
  }

  async recomputePoints(userId: string): Promise<number> {
    const done = await this.bookings.find({ where: { userId, status: 'completed' } });
    const pts = done.reduce((a, b) => a + POINTS_PER_VISITOR * b.partySize, 0);
    const user = await this.users.findOne({ where: { id: userId } });
    if (user && user.points !== pts) {
      user.points = pts;
      await this.users.save(user as any);
    }
    return pts;
  }

  async hold(
    userId: string,
    windowId: string,
    dto: { partySize: number; lines: { cropId: string; kg: number }[]; addonIds?: string[] },
  ) {
    return withLock(() => this.holdLocked(userId, windowId, dto));
  }

  private async holdLocked(
    userId: string,
    windowId: string,
    dto: { partySize: number; lines: { cropId: string; kg: number }[]; addonIds?: string[] },
  ) {
    await this.expireStale();
    const partySize = Math.max(1, Math.min(6, Number(dto.partySize) || 1));
    const w = await this.windows.findOne({ where: { id: windowId }, relations: { fieldDay: true } });
    if (!w || !w.fieldDay) throw new NotFoundException('Ventana no encontrada');
    const day = w.fieldDay;
    if (day.status === 'closed') conflict('FIELD_CLOSED', 'El huerto está cerrado ese día');
    if (windowHasPassed(day.date, w.endTime)) conflict('WINDOW_PAST', 'Esa ventana ya ha pasado');

    const dup = await this.bookings.findOne({
      where: [
        { userId, windowId, status: 'pending' },
        { userId, windowId, status: 'confirmed' },
        { userId, windowId, status: 'checked_in' },
      ],
    });
    if (dup) {
      if (dup.status === 'pending' && dup.expiresAt && dup.expiresAt.getTime() < Date.now()) {
        await this.expireOne(dup);
      } else if (dup.status === 'pending') {
        conflict('ALREADY_HELD', 'Ya tienes una retención viva en esta ventana');
      } else {
        conflict('ALREADY_BOOKED', 'Ya tienes un pase en esta ventana');
      }
    }

    await this.syncReserved(w);
    if (partySize > Math.max(0, w.capacity - w.reservedCount)) {
      conflict('WINDOW_FULL', 'No quedan plazas en esta ventana');
    }

    const month = madridMonth();
    const requested = dto.lines || [];
    if (!requested.length) conflict('EMPTY_CRATE', 'La cesta no puede estar vacía');

    const cropIds = requested.map((l) => l.cropId);
    const crops = await this.crops.find({ where: { id: In(cropIds) } });
    const byId = new Map(crops.map((c) => [c.id, c]));

    for (const line of requested) {
      const crop = byId.get(line.cropId);
      if (!crop || !crop.isActive) throw new NotFoundException('Cultivo no encontrado');
      if (!this.isRipe(crop, month)) conflict('NOT_RIPE', `${crop.name} no está maduro hoy`);
      const kg = Number(line.kg);
      if (!(kg >= 0.5 && kg <= 10)) conflict('BAD_KG', 'Cada cultivo admite entre 0,5 y 10 kg');
      const remaining = await this.remainingKg(crop.id, day.date);
      if (kg > remaining) conflict('INSUFFICIENT_KG', `No quedan kilos de ${crop.name}`);
    }

    const addons = dto.addonIds?.length
      ? await this.addons.find({ where: { id: In(dto.addonIds), isActive: true } })
      : [];

    const expiresAt = new Date(Date.now() + HOLD_MS);
    let code = makeCode();
    while (await this.bookings.findOne({ where: { code } })) code = makeCode();

    const booking = (await this.bookings.save({
      userId,
      fieldDayId: day.id,
      windowId: w.id,
      partySize,
      status: 'pending',
      code,
      expiresAt,
      qrSvg: null,
      qrUrl: null,
      confirmedAt: null,
      checkedInAt: null,
      completedAt: null,
    } as any)) as Booking;

    let order = 0;
    for (const line of requested) {
      const crop = byId.get(line.cropId)!;
      const kg = Number(line.kg);
      await this.lines.save({
        bookingId: booking.id,
        cropId: crop.id,
        estimatedKg: kg,
        actualKg: null,
        unitPrice: crop.pricePerKg,
        amount: lineAmount(kg, crop.pricePerKg),
      } as any);
      await this.crate.save({
        bookingId: booking.id,
        cropId: crop.id,
        kg,
        sortOrder: order++,
      } as any);
    }
    for (const ad of addons) {
      await this.bookingAddons.save({ bookingId: booking.id, addonId: ad.id, qty: 1 } as any);
    }

    w.reservedCount += partySize;
    await this.windows.save(w as any);
    return this.loadBooking(booking.id);
  }

  async confirm(userId: string, id: string, _paymentRef?: string) {
    const pre = await this.bookings.findOne({ where: { id, userId } });
    if (!pre) throw new NotFoundException('Cosecha no encontrada');
    if (pre.status === 'confirmed' || pre.status === 'checked_in' || pre.status === 'completed') {
      return {
        booking: await this.loadBooking(pre.id),
        qrSvg: pre.qrSvg,
        qrUrl: pre.qrUrl,
      };
    }
    if (pre.status === 'cancelled' || pre.status === 'expired') {
      conflict('NOT_CONFIRMABLE', 'Este pase no se puede confirmar');
    }
    if (pre.expiresAt && pre.expiresAt.getTime() < Date.now()) {
      await this.expireOne(pre);
      conflict('NOT_CONFIRMABLE', 'La retención expiró');
    }

    const url = paseUrl(pre.code);
    const qrSvg = await buildPaseQrSvg(url, pre.code);
    pre.status = 'confirmed';
    pre.expiresAt = null;
    pre.confirmedAt = new Date();
    pre.qrUrl = url;
    pre.qrSvg = qrSvg;
    await this.bookings.save(pre as any);

    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      await this.emails.save({
        userId,
        toAddress: user.email,
        subject: `Tu pase Bancal ${pre.code}`,
        body: `Pase ${pre.code}\n${url}`,
        sentAt: new Date(),
      } as any);
    }

    const booking = await this.loadBooking(pre.id);
    return { booking, qrSvg, qrUrl: url };
  }

  async cancel(userId: string, id: string) {
    const booking = await this.bookings.findOne({
      where: { id, userId },
      relations: { window: true, fieldDay: true },
    });
    if (!booking) throw new NotFoundException('Cosecha no encontrada');
    if (booking.status === 'cancelled' || booking.status === 'expired') return this.loadBooking(id);
    if (booking.status === 'checked_in' || booking.status === 'completed') {
      conflict('NOT_CONFIRMABLE', 'Ya no se puede cancelar');
    }
    if (booking.status === 'confirmed' && booking.window && booking.fieldDay) {
      const hours = hoursUntilWindowStart(booking.fieldDay.date, booking.window.startTime);
      if (hours < 24) conflict('TOO_LATE', 'Cancelación solo hasta 24 h antes');
    }
    booking.status = 'cancelled';
    booking.expiresAt = null;
    await this.bookings.save(booking as any);
    if (booking.window) {
      await this.syncReserved(booking.window);
    }
    return this.loadBooking(id);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const pending = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of pending) {
      if (b.expiresAt && b.expiresAt.getTime() < now.getTime()) {
        await this.expireOne(b);
        n += 1;
      }
    }
    return n;
  }

  private async expireOne(b: Booking) {
    b.status = 'expired';
    await this.bookings.save(b as any);
    const w = await this.windows.findOne({ where: { id: b.windowId } });
    if (w) await this.syncReserved(w);
  }

  async checkIn(rawCode: string) {
    await this.expireStale();
    const code = extractTicketCode(rawCode);
    const booking = await this.bookings.findOne({ where: { code } });
    if (!booking) throw new NotFoundException('Pase no encontrado');
    if (booking.status === 'checked_in' || booking.status === 'completed') {
      conflict('ALREADY_CHECKED_IN', 'Este pase ya pasó la cancela');
    }
    if (booking.status !== 'confirmed') {
      conflict('NOT_CONFIRMABLE', 'Solo se puede escanear un pase comprado');
    }
    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    await this.bookings.save(booking as any);
    return this.loadBooking(booking.id);
  }

  async weigh(id: string, updates: { cropId: string; actualKg: number }[]) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!booking) throw new NotFoundException('Cosecha no encontrada');
    if (booking.status !== 'checked_in' && booking.status !== 'completed') {
      conflict('NOT_CONFIRMABLE', 'Hay que hacer check-in antes de pesar');
    }
    for (const u of updates) {
      const line = (booking.lines || []).find((l) => l.cropId === u.cropId);
      if (!line) continue;
      line.actualKg = Number(u.actualKg);
      line.amount = lineAmount(line.actualKg, line.unitPrice);
      await this.lines.save(line as any);
    }
    booking.status = 'completed';
    booking.completedAt = new Date();
    await this.bookings.save(booking as any);
    await this.recomputePoints(booking.userId);
    return this.loadBooking(id);
  }

  async patchFieldDay(date: string, dto: { status?: string; note?: string; maxVisitors?: number }) {
    const day = await this.ensureDay(date);
    if (dto.status && ['open', 'limited', 'closed'].includes(dto.status)) {
      day.status = dto.status as FieldDay['status'];
    }
    if (dto.note !== undefined) day.note = dto.note;
    if (dto.maxVisitors) day.maxVisitors = dto.maxVisitors;
    await this.days.save(day as any);
    return this.todayFieldDay();
  }

  async addReview(userId: string, bookingId: string, dto: { rating: number; comment?: string; cropId?: string }) {
    const booking = await this.bookings.findOne({ where: { id: bookingId, userId } });
    if (!booking) throw new NotFoundException('Cosecha no encontrada');
    if (booking.status !== 'completed') conflict('NOT_CONFIRMABLE', 'Solo se reseña una visita completada');
    const existing = await this.reviews.findOne({ where: { bookingId } });
    if (existing) conflict('ALREADY_BOOKED', 'Ya hay reseña para esta visita');
    const rating = Math.max(1, Math.min(5, Number(dto.rating) || 1));
    const review = (await this.reviews.save({
      bookingId,
      userId,
      cropId: dto.cropId || null,
      rating,
      comment: dto.comment || null,
    } as any)) as Review;
    return review;
  }

  async cropReviews(cropId: string) {
    const items = await this.reviews.find({ where: { cropId }, order: { createdAt: 'DESC' } });
    const avg = items.length ? money(items.reduce((a, r) => a + r.rating, 0) / items.length) : 0;
    return { avg, items };
  }

  async statsToday() {
    const date = madridToday();
    const day = await this.days.findOne({ where: { date } });
    if (!day) return { visitors: 0, kgByCrop: [], revenue: 0 };
    const bookings = await this.bookings.find({
      where: { fieldDayId: day.id, status: In(['confirmed', 'checked_in', 'completed']) },
      relations: { lines: { crop: true }, addons: { addon: true } },
    });
    const visitors = bookings.reduce((a, b) => a + b.partySize, 0);
    const kgMap = new Map<string, { name: string; kg: number }>();
    let revenue = 0;
    for (const b of bookings) {
      revenue += this.bookingTotal(b);
      for (const l of b.lines || []) {
        const kg = l.actualKg ?? l.estimatedKg;
        const prev = kgMap.get(l.cropId) || { name: l.crop?.name || l.cropId, kg: 0 };
        prev.kg = money(prev.kg + kg);
        kgMap.set(l.cropId, prev);
      }
    }
    return { visitors, kgByCrop: [...kgMap.values()], revenue: money(revenue) };
  }
}
