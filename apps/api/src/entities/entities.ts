import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 80 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'visitor' })
  role: 'visitor' | 'staff' | 'admin';

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b) => b.user)
  bookings?: Booking[];
}

@Entity({ name: 'crops' })
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'real' })
  pricePerKg: number;

  @Column({ type: 'simple-json' })
  ripeMonths: number[];

  @Column({ type: 'real' })
  dailyKg: number;

  @Column({ type: 'varchar', length: 240, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => BookingLine, (l) => l.crop)
  lines?: BookingLine[];
}

@Entity({ name: 'plots' })
export class Plot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 24 })
  exposure: 'solana' | 'umbria';

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => PlotCrop, (pc) => pc.plot)
  plotCrops?: PlotCrop[];
}

@Entity({ name: 'plot_crop' })
export class PlotCrop {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  plotId: string;

  @PrimaryColumn({ type: 'varchar', length: 36 })
  cropId: string;

  @ManyToOne(() => Plot, (p) => p.plotCrops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plotId' })
  plot?: Plot;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cropId' })
  crop?: Crop;
}

@Entity({ name: 'field_days' })
export class FieldDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  date: string;

  @Column({ type: 'varchar', length: 16 })
  status: 'open' | 'limited' | 'closed';

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ type: 'int', default: 48 })
  maxVisitors: number;

  @OneToMany(() => HarvestWindow, (w) => w.fieldDay)
  windows?: HarvestWindow[];

  @OneToMany(() => Booking, (b) => b.fieldDay)
  bookings?: Booking[];
}

@Entity({ name: 'harvest_windows' })
@Index(['fieldDayId', 'startTime'], { unique: true })
export class HarvestWindow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  fieldDayId: string;

  @ManyToOne(() => FieldDay, (d) => d.windows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldDayId' })
  fieldDay?: FieldDay;

  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'int', default: 24 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  reservedCount: number;

  @OneToMany(() => Booking, (b) => b.window)
  bookings?: Booking[];
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'expired';

@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, (u) => u.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 36 })
  fieldDayId: string;

  @ManyToOne(() => FieldDay, (d) => d.bookings)
  @JoinColumn({ name: 'fieldDayId' })
  fieldDay?: FieldDay;

  @Column({ type: 'varchar', length: 36 })
  windowId: string;

  @ManyToOne(() => HarvestWindow, (w) => w.bookings)
  @JoinColumn({ name: 'windowId' })
  window?: HarvestWindow;

  @Column({ type: 'int' })
  partySize: number;

  @Column({ type: 'varchar', length: 20 })
  status: BookingStatus;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  qrSvg: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  qrUrl: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => BookingLine, (l) => l.booking)
  lines?: BookingLine[];

  @OneToMany(() => CrateEntry, (c) => c.booking)
  crate?: CrateEntry[];

  @OneToMany(() => BookingAddon, (a) => a.booking)
  addons?: BookingAddon[];

  @OneToOne(() => Review, (r) => r.booking)
  review?: any;
}

@Entity({ name: 'booking_lines' })
export class BookingLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 36 })
  cropId: string;

  @ManyToOne(() => Crop, (c) => c.lines)
  @JoinColumn({ name: 'cropId' })
  crop?: Crop;

  @Column({ type: 'real' })
  estimatedKg: number;

  @Column({ type: 'real', nullable: true })
  actualKg: number | null;

  @Column({ type: 'real' })
  unitPrice: number;

  @Column({ type: 'real' })
  amount: number;
}

@Entity({ name: 'crate_entries' })
export class CrateEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.crate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 36 })
  cropId: string;

  @ManyToOne(() => Crop)
  @JoinColumn({ name: 'cropId' })
  crop?: Crop;

  @Column({ type: 'real' })
  kg: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'real' })
  price: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

@Entity({ name: 'booking_addons' })
export class BookingAddon {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  bookingId: string;

  @PrimaryColumn({ type: 'varchar', length: 36 })
  addonId: string;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @ManyToOne(() => Booking, (b) => b.addons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @ManyToOne(() => Addon)
  @JoinColumn({ name: 'addonId' })
  addon?: Addon;
}

@Entity({ name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  cropId: string | null;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 400, nullable: true })
  comment: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity({ name: 'email_logs' })
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 180 })
  toAddress: string;

  @Column({ type: 'varchar', length: 160 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Crop,
  Plot,
  PlotCrop,
  FieldDay,
  HarvestWindow,
  Booking,
  BookingLine,
  CrateEntry,
  Addon,
  BookingAddon,
  Review,
  EmailLog,
];
