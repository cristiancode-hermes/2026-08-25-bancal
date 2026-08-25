import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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
import { addMadridDays, madridToday } from '../common/time';
import { buildPaseQrSvg, paseUrl } from '../common/qr';
import { lineAmount } from '../common/money';

const DEMO_PASS = 'Bancal2026!';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
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
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    const n = await this.users.count();
    if (n > 0) {
      this.log.log('Seed skipped (users already present)');
      return;
    }
    await this.seed();
  }

  async seed() {
    const hash = await bcrypt.hash(DEMO_PASS, 10);
    const huerta = (await this.users.save({
      username: 'huerta',
      email: 'huerta@bancal.test',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    const hortelano = (await this.users.save({
      username: 'hortelano',
      email: 'hortelano@bancal.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;
    await this.users.save({
      username: 'bancal',
      email: 'admin@bancal.test',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any);

    const cropDefs = [
      {
        slug: 'tomate-pera',
        name: 'Tomate pera',
        description: 'De ensalada y sofrito. Se desprende con un giro suave cuando está maduro.',
        pricePerKg: 3.4,
        ripeMonths: [6, 7, 8, 9, 10],
        dailyKg: 40,
        photoUrl: '/assets/tomate.svg',
      },
      {
        slug: 'higo-cuello',
        name: 'Higo cuello de dama',
        description: 'Piel fina, miel interior. Solo se recogen los que ceden al tacto.',
        pricePerKg: 5.8,
        ripeMonths: [7, 8, 9],
        dailyKg: 18,
        photoUrl: '/assets/higo.svg',
      },
      {
        slug: 'pimiento-italiano',
        name: 'Pimiento italiano',
        description: 'Largos, dulces, para la plancha o crudos.',
        pricePerKg: 3.1,
        ripeMonths: [7, 8, 9, 10],
        dailyKg: 22,
        photoUrl: '/assets/pimiento.svg',
      },
      {
        slug: 'calabacin',
        name: 'Calabacín',
        description: 'Tierno si no supera el palmo. Se corta con tijera, no se tira.',
        pricePerKg: 2.2,
        ripeMonths: [6, 7, 8, 9],
        dailyKg: 30,
        photoUrl: '/assets/calabacin.svg',
      },
      {
        slug: 'albahaca',
        name: 'Albahaca',
        description: 'Manojo fresco. Pellizca las puntas, no arranques el pie.',
        pricePerKg: 12.0,
        ripeMonths: [5, 6, 7, 8, 9, 10],
        dailyKg: 6,
        photoUrl: '/assets/albahaca.svg',
      },
      {
        slug: 'judia-verde',
        name: 'Judía verde',
        description: 'Vaina crujiente. Si se ve la semilla, déjala un día más.',
        pricePerKg: 4.0,
        ripeMonths: [6, 7, 8, 9],
        dailyKg: 16,
        photoUrl: '/assets/judia.svg',
      },
      {
        slug: 'naranja-amarga',
        name: 'Naranja de invierno',
        description: 'Fuera de temporada en agosto. Vuelve en diciembre.',
        pricePerKg: 2.4,
        ripeMonths: [12, 1, 2],
        dailyKg: 50,
        photoUrl: '/assets/naranja.svg',
      },
      {
        slug: 'haba',
        name: 'Haba',
        description: 'Primavera. En agosto el bancal descansa.',
        pricePerKg: 3.6,
        ripeMonths: [2, 3, 4],
        dailyKg: 20,
        photoUrl: '/assets/haba.svg',
      },
    ];
    const crops: Crop[] = [];
    for (const def of cropDefs) {
      crops.push((await this.crops.save({ ...def, isActive: true } as any)) as Crop);
    }

    const plotDefs: Array<{ name: string; exposure: 'solana' | 'umbria'; notes: string; cropSlugs: string[] }> = [
      { name: 'Bancal del acequia', exposure: 'solana', notes: 'Riego por tabla', cropSlugs: ['tomate-pera', 'pimiento-italiano'] },
      { name: 'Bancal de la higuera', exposure: 'solana', notes: 'Suelo arenoso', cropSlugs: ['higo-cuello', 'albahaca'] },
      { name: 'Bancal umbrío', exposure: 'umbria', notes: 'Media sombra de chopos', cropSlugs: ['calabacin', 'judia-verde'] },
      { name: 'Bancal de invierno', exposure: 'solana', notes: 'Descanso de verano', cropSlugs: ['naranja-amarga', 'haba'] },
    ];
    for (const p of plotDefs) {
      const plot = (await this.plots.save({ name: p.name, exposure: p.exposure, notes: p.notes } as any)) as Plot;
      for (const slug of p.cropSlugs) {
        const crop = crops.find((c) => c.slug === slug)!;
        await this.plotCrops.save({ plotId: plot.id, cropId: crop.id } as any);
      }
    }

    const addonDefs = [
      { name: 'Cesta de mimbre', price: 4.5 },
      { name: 'Tijeras de recolecta', price: 2.0 },
      { name: 'Delantal de lona', price: 6.0 },
      { name: 'Tarro de mermelada', price: 5.5 },
      { name: 'Aceite de la finca', price: 8.0 },
    ];
    const addons: Addon[] = [];
    for (const a of addonDefs) {
      addons.push((await this.addons.save({ ...a, isActive: true } as any)) as Addon);
    }

    const today = madridToday();
    const calendar: Array<{ date: string; status: FieldDay['status']; note: string | null }> = [
      { date: addMadridDays(today, -1), status: 'open', note: 'Jornada anterior, ya cerrada al público' },
      { date: today, status: 'open', note: 'Sol y riego de madrugada. Higos en su punto.' },
      { date: addMadridDays(today, 1), status: 'open', note: 'Previsión despejada' },
      { date: addMadridDays(today, 2), status: 'limited', note: 'Aforo reducido por riego de fondo' },
      { date: addMadridDays(today, 3), status: 'closed', note: 'Descanso del suelo — no se recolecta' },
    ];
    const dayByDate = new Map<string, FieldDay>();
    for (const c of calendar) {
      const day = (await this.days.save({
        date: c.date,
        status: c.status,
        note: c.note,
        maxVisitors: c.status === 'limited' ? 24 : 48,
      } as any)) as FieldDay;
      dayByDate.set(c.date, day);
      const cap = c.status === 'limited' ? 12 : 24;
      for (const spec of [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '16:00', endTime: '19:00' },
      ]) {
        await this.windows.save({
          fieldDayId: day.id,
          startTime: spec.startTime,
          endTime: spec.endTime,
          capacity: cap,
          reservedCount: 0,
        } as any);
      }
    }

    const yesterday = addMadridDays(today, -1);
    const yDay = dayByDate.get(yesterday)!;
    const yWin = await this.windows.findOne({ where: { fieldDayId: yDay.id, startTime: '09:00' } });
    const tomate = crops.find((c) => c.slug === 'tomate-pera')!;
    const higo = crops.find((c) => c.slug === 'higo-cuello')!;
    const completed = (await this.bookings.save({
      userId: huerta.id,
      fieldDayId: yDay.id,
      windowId: yWin!.id,
      partySize: 2,
      status: 'completed',
      code: 'BNCL-SEED',
      expiresAt: null,
      qrUrl: paseUrl('BNCL-SEED'),
      qrSvg: null,
      confirmedAt: new Date(Date.now() - 36e5 * 30),
      checkedInAt: new Date(Date.now() - 36e5 * 28),
      completedAt: new Date(Date.now() - 36e5 * 26),
    } as any)) as Booking;
    completed.qrSvg = await buildPaseQrSvg(completed.qrUrl!, completed.code);
    await this.bookings.save(completed as any);

    const lineA = { crop: tomate, kg: 2.5 };
    const lineB = { crop: higo, kg: 1.0 };
    for (const [i, l] of [lineA, lineB].entries()) {
      await this.lines.save({
        bookingId: completed.id,
        cropId: l.crop.id,
        estimatedKg: l.kg,
        actualKg: l.kg,
        unitPrice: l.crop.pricePerKg,
        amount: lineAmount(l.kg, l.crop.pricePerKg),
      } as any);
      await this.crate.save({
        bookingId: completed.id,
        cropId: l.crop.id,
        kg: l.kg,
        sortOrder: i,
      } as any);
    }
    await this.bookingAddons.save({ bookingId: completed.id, addonId: addons[0].id, qty: 1 } as any);
    await this.reviews.save({
      bookingId: completed.id,
      userId: huerta.id,
      cropId: tomate.id,
      rating: 5,
      comment: 'Los higos se caían solos. Volveremos.',
    } as any);
    huerta.points = 12 * 2;
    await this.users.save(huerta as any);

    const tDay = dayByDate.get(today)!;
    const tWin = await this.windows.findOne({ where: { fieldDayId: tDay.id, startTime: '16:00' } });
    const confirmed = (await this.bookings.save({
      userId: huerta.id,
      fieldDayId: tDay.id,
      windowId: tWin!.id,
      partySize: 2,
      status: 'confirmed',
      code: 'BNCL-HOY1',
      expiresAt: null,
      qrUrl: paseUrl('BNCL-HOY1'),
      qrSvg: null,
      confirmedAt: new Date(),
    } as any)) as Booking;
    confirmed.qrSvg = await buildPaseQrSvg(confirmed.qrUrl!, confirmed.code);
    await this.bookings.save(confirmed as any);
    await this.lines.save({
      bookingId: confirmed.id,
      cropId: tomate.id,
      estimatedKg: 1.5,
      actualKg: null,
      unitPrice: tomate.pricePerKg,
      amount: lineAmount(1.5, tomate.pricePerKg),
    } as any);
    await this.crate.save({
      bookingId: confirmed.id,
      cropId: tomate.id,
      kg: 1.5,
      sortOrder: 0,
    } as any);
    tWin!.reservedCount = 2;
    await this.windows.save(tWin as any);

    await this.emails.save({
      userId: huerta.id,
      toAddress: huerta.email,
      subject: 'Tu pase Bancal BNCL-HOY1',
      body: `Pase BNCL-HOY1\n${paseUrl('BNCL-HOY1')}`,
      sentAt: new Date(),
    } as any);

    this.log.log(`Seeded Bancal. Demo huerta@bancal.test / ${DEMO_PASS}. Staff hortelano. Unused ${hortelano.username}`);
  }
}
