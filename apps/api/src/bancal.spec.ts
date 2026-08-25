import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ALL_ENTITIES, Addon, Crop, FieldDay, HarvestWindow, User } from './entities/entities';
import { HarvestService } from './harvest/harvest.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { madridMonth, madridToday } from './common/time';
import { extractTicketCode, paseUrl } from './common/qr';

process.env.WEB_ORIGIN = 'https://bancal.proyectos.cristiancode.dev';
process.env.JWT_SECRET = 'test-secret';

describe('Bancal harvest', () => {
  let app: INestApplication;
  let harvest: HarvestService;
  let auth: AuthService;
  let users: Repository<User>;
  let crops: Repository<Crop>;
  let days: Repository<FieldDay>;
  let windows: Repository<HarvestWindow>;
  let addons: Repository<Addon>;
  let visitor: User;
  let staff: User;
  let ripe: Crop;
  let unripe: Crop;
  let openWin: HarvestWindow;
  let closedWin: HarvestWindow;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
        AuthModule,
      ],
      providers: [HarvestService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    harvest = moduleRef.get(HarvestService);
    auth = moduleRef.get(AuthService);
    users = moduleRef.get(getRepositoryToken(User));
    crops = moduleRef.get(getRepositoryToken(Crop));
    days = moduleRef.get(getRepositoryToken(FieldDay));
    windows = moduleRef.get(getRepositoryToken(HarvestWindow));
    addons = moduleRef.get(getRepositoryToken(Addon));

    const hash = await bcrypt.hash('Bancal2026!', 10);
    visitor = (await users.save({
      username: 'huerta',
      email: 'huerta@bancal.test',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    staff = (await users.save({
      username: 'hortelano',
      email: 'hortelano@bancal.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;

    const month = madridMonth();
    ripe = (await crops.save({
      slug: 'tomate',
      name: 'Tomate',
      description: 'Maduro',
      pricePerKg: 3,
      ripeMonths: [month],
      dailyKg: 10,
      photoUrl: '/assets/tomate.svg',
      isActive: true,
    } as any)) as Crop;
    unripe = (await crops.save({
      slug: 'naranja',
      name: 'Naranja',
      description: 'Invierno',
      pricePerKg: 2,
      ripeMonths: [((month + 5) % 12) + 1],
      dailyKg: 10,
      photoUrl: '/assets/naranja.svg',
      isActive: true,
    } as any)) as Crop;

    const today = madridToday();
    const openDay = (await days.save({ date: today, status: 'open', note: 'ok', maxVisitors: 48 } as any)) as FieldDay;
    const closedDay = (await days.save({
      date: today + '-x' === today ? `${today.slice(0, 8)}99` : today.replace(/.$/, '9'),
      status: 'closed',
      note: 'barro',
      maxVisitors: 48,
    } as any)) as FieldDay;
    // Use a guaranteed closed date
    await days.delete({ id: closedDay.id });
    const closed = (await days.save({
      date: '2099-01-01',
      status: 'closed',
      note: 'helada',
      maxVisitors: 48,
    } as any)) as FieldDay;

    openWin = (await windows.save({
      fieldDayId: openDay.id,
      startTime: '16:00',
      endTime: '19:00',
      capacity: 4,
      reservedCount: 0,
    } as any)) as HarvestWindow;
    closedWin = (await windows.save({
      fieldDayId: closed.id,
      startTime: '09:00',
      endTime: '12:00',
      capacity: 24,
      reservedCount: 0,
    } as any)) as HarvestWindow;

    await addons.save({ name: 'Cesta', price: 4.5, isActive: true } as any);
  });

  afterAll(async () => {
    await app.close();
  });

  it('login acepta username o email', async () => {
    const a = await auth.login({ identifier: 'huerta', password: 'Bancal2026!' });
    const b = await auth.login({ identifier: 'huerta@bancal.test', password: 'Bancal2026!' });
    expect(a.accessToken).toBeTruthy();
    expect(b.user.email).toBe('huerta@bancal.test');
  });

  it('cultivo fuera de temporada no está maduro', () => {
    expect(harvest.isRipe(ripe)).toBe(true);
    expect(harvest.isRipe(unripe)).toBe(false);
  });

  it('listCrops filter ripe oculta naranja', async () => {
    const ripeList = await harvest.listCrops('ripe');
    expect(ripeList.find((c) => c.slug === 'tomate')).toBeTruthy();
    expect(ripeList.find((c) => c.slug === 'naranja')).toBeFalsy();
  });

  it('hold contra FieldDay closed → 409 FIELD_CLOSED', async () => {
    await expect(
      harvest.hold(visitor.id, closedWin.id, { partySize: 1, lines: [{ cropId: ripe.id, kg: 1 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'FIELD_CLOSED' } });
  });

  it('hold crea pending con expiresAt servidor ~15 min', async () => {
    const b = await harvest.hold(visitor.id, openWin.id, {
      partySize: 2,
      lines: [{ cropId: ripe.id, kg: 1.5 }],
    });
    expect(b.status).toBe('pending');
    expect(b.expiresAt).toBeTruthy();
    const ms = new Date(b.expiresAt as any).getTime() - Date.now();
    expect(ms).toBeGreaterThan(14 * 60 * 1000);
    expect(ms).toBeLessThan(16 * 60 * 1000);
    expect(b.total).toBe(4.5);
    expect(b.crate.length).toBe(1);
  });

  it('segundo hold same-user+ventana → 409 ALREADY_HELD', async () => {
    await expect(
      harvest.hold(visitor.id, openWin.id, { partySize: 1, lines: [{ cropId: ripe.id, kg: 0.5 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_HELD' } });
  });

  it('confirm genera QR real con URL absoluta', async () => {
    const mine = await harvest.mine(visitor.id);
    const pending = mine.find((b) => b.status === 'pending')!;
    const res = await harvest.confirm(visitor.id, pending.id);
    expect(res.qrUrl).toBe(paseUrl(res.booking.code));
    expect(res.qrSvg).toContain(res.qrUrl);
    expect(res.qrSvg).toContain('<svg');
    expect(res.booking.status).toBe('confirmed');
  });

  it('GET público del pase 200 y mismo total lista↔detalle', async () => {
    const list = await harvest.mine(visitor.id);
    const confirmed = list.find((b) => b.status === 'confirmed')!;
    const detail = await harvest.getMine(visitor.id, confirmed.id);
    expect(detail.total).toBe(confirmed.total);
    const pub = await harvest.publicTicket(confirmed.code);
    expect(pub.booking.total).toBe(confirmed.total);
    expect(pub.qrUrl).toContain('/pase/');
  });

  it('segundo hold tras confirmed → 409 ALREADY_BOOKED', async () => {
    await expect(
      harvest.hold(visitor.id, openWin.id, { partySize: 1, lines: [{ cropId: ripe.id, kg: 0.5 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_BOOKED' } });
  });

  it('check-in por código o URL y segundo scan 409', async () => {
    const list = await harvest.mine(visitor.id);
    const confirmed = list.find((b) => b.status === 'confirmed')!;
    const url = confirmed.qrUrl as string;
    expect(extractTicketCode(url)).toBe(confirmed.code);
    const in1 = await harvest.checkIn(url);
    expect(in1.status).toBe('checked_in');
    await expect(harvest.checkIn(confirmed.code)).rejects.toMatchObject({
      status: 409,
      response: { code: 'ALREADY_CHECKED_IN' },
    });
  });

  it('weigh completa y puntos = 12 × partySize', async () => {
    const list = await harvest.mine(visitor.id);
    const row = list.find((b) => b.status === 'checked_in')!;
    const weighed = await harvest.weigh(row.id, [{ cropId: ripe.id, actualKg: 1.5 }]);
    expect(weighed.status).toBe('completed');
    const pts = await harvest.points(visitor.id);
    expect(pts.points).toBe(12 * 2);
  });

  it('INSUFFICIENT_KG cuando se pide más que el cupo', async () => {
    const other = (await users.save({
      username: 'otra',
      email: 'otra@bancal.test',
      passwordHash: await bcrypt.hash('Bancal2026!', 10),
      role: 'visitor',
      points: 0,
    } as any)) as User;
    const extra = (await windows.save({
      fieldDayId: openWin.fieldDayId,
      startTime: '09:00',
      endTime: '12:00',
      capacity: 24,
      reservedCount: 0,
    } as any)) as HarvestWindow;
    await expect(
      harvest.hold(other.id, extra.id, { partySize: 1, lines: [{ cropId: ripe.id, kg: 10 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'INSUFFICIENT_KG' } });
  });

  it('WINDOW_FULL cuando partySize > freeSlots', async () => {
    const tiny = (await windows.save({
      fieldDayId: openWin.fieldDayId,
      startTime: '09:01',
      endTime: '12:00',
      capacity: 1,
      reservedCount: 0,
    } as any)) as HarvestWindow;
    const guest = (await users.save({
      username: 'lleno',
      email: 'lleno@bancal.test',
      passwordHash: await bcrypt.hash('Bancal2026!', 10),
      role: 'visitor',
      points: 0,
    } as any)) as User;
    await expect(
      harvest.hold(guest.id, tiny.id, { partySize: 2, lines: [{ cropId: ripe.id, kg: 0.5 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'WINDOW_FULL' } });
  });

  it('sweeper libera pending vencido', async () => {
    const guest = (await users.save({
      username: 'expira',
      email: 'expira@bancal.test',
      passwordHash: await bcrypt.hash('Bancal2026!', 10),
      role: 'visitor',
      points: 0,
    } as any)) as User;
    const win = (await windows.save({
      fieldDayId: openWin.fieldDayId,
      startTime: '09:02',
      endTime: '12:00',
      capacity: 6,
      reservedCount: 0,
    } as any)) as HarvestWindow;
    const held = await harvest.hold(guest.id, win.id, { partySize: 1, lines: [{ cropId: ripe.id, kg: 0.5 }] });
    const repo = app.get(getRepositoryToken(require('./entities/entities').Booking));
    held.expiresAt = new Date(Date.now() - 1000);
    await repo.save({ id: held.id, expiresAt: new Date(Date.now() - 1000) } as any);
    const n = await harvest.expireStale();
    expect(n).toBeGreaterThanOrEqual(1);
    const after = await harvest.getMine(guest.id, held.id);
    expect(after.status).toBe('expired');
  });

  it('cultivo inexistente → 404', async () => {
    await expect(harvest.getCrop('00000000-0000-0000-0000-000000000099')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('NOT_RIPE si se fuerza un cultivo fuera de temporada', async () => {
    const guest = (await users.save({
      username: 'invierno',
      email: 'invierno@bancal.test',
      passwordHash: await bcrypt.hash('Bancal2026!', 10),
      role: 'visitor',
      points: 0,
    } as any)) as User;
    const win = (await windows.save({
      fieldDayId: openWin.fieldDayId,
      startTime: '09:03',
      endTime: '12:00',
      capacity: 6,
      reservedCount: 0,
    } as any)) as HarvestWindow;
    await expect(
      harvest.hold(guest.id, win.id, { partySize: 1, lines: [{ cropId: unripe.id, kg: 1 }] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'NOT_RIPE' } });
  });

  it('staff no usado en visitor tests', () => {
    expect(staff.role).toBe('staff');
  });

  it('windows de hoy exponen freeSlots canónico', async () => {
    const list = await harvest.listWindows(madridToday());
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('freeSlots');
    expect(list[0].freeSlots).toBe(list[0].capacity - list[0].reservedCount);
  });

  it('register duplicado 409', async () => {
    await expect(
      auth.register({ username: 'huerta', email: 'otro@x.test', password: 'Bancal2026!' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
