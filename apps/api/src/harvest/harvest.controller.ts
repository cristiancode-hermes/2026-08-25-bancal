import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HarvestService } from './harvest.service';
import { CheckInDto, ConfirmDto, HoldDto, PatchDayDto, ReviewDto, WeighDto } from './harvest.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

@ApiTags('harvest')
@Controller()
export class HarvestController {
  constructor(private readonly harvest: HarvestService) {}

  @Get('crops')
  listCrops(@Query('filter') filter?: string, @Query('ripe') ripe?: string) {
    const f = filter || (ripe === 'today' ? 'ripe' : 'all');
    return this.harvest.listCrops(f);
  }

  @Get('crops/:id/reviews')
  cropReviews(@Param('id') id: string) {
    return this.harvest.cropReviews(id);
  }

  @Get('crops/:id')
  getCrop(@Param('id') id: string) {
    return this.harvest.getCrop(id);
  }

  @Get('plots')
  plots() {
    return this.harvest.listPlots();
  }

  @Get('addons')
  addons() {
    return this.harvest.listAddons();
  }

  @Get('field-days/today')
  today() {
    return this.harvest.todayFieldDay();
  }

  @Get('field-days')
  days(@Query('from') from?: string, @Query('to') to?: string) {
    return this.harvest.listFieldDays(from, to);
  }

  @Get('windows')
  windows(@Query('date') date?: string) {
    return this.harvest.listWindows(date);
  }

  @Get('windows/:id')
  window(@Param('id') id: string) {
    return this.harvest.getWindow(id);
  }

  @Post('windows/:id/hold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hold(
    @Param('id') id: string,
    @Body() dto: HoldDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.harvest.hold(user.userId, id, dto);
  }

  @Get('bookings/ticket/:code')
  ticket(@Param('code') code: string) {
    return this.harvest.publicTicket(code);
  }

  @Get('bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: { userId: string }) {
    return this.harvest.mine(user.userId);
  }

  @Get('bookings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.harvest.getMine(user.userId, id);
  }

  @Post('bookings/:id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.harvest.confirm(user.userId, id, dto?.paymentRef);
  }

  @Post('bookings/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.harvest.cancel(user.userId, id);
  }

  @Post('bookings/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.harvest.addReview(user.userId, id, dto);
  }

  @Get('me/points')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  points(@CurrentUser() user: { userId: string }) {
    return this.harvest.points(user.userId);
  }

  @Post('staff/check-in')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  checkIn(@Body() dto: CheckInDto) {
    return this.harvest.checkIn(dto.code);
  }

  @Patch('staff/bookings/:id/weigh')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  weigh(@Param('id') id: string, @Body() dto: WeighDto) {
    return this.harvest.weigh(id, dto.lines);
  }

  @Patch('staff/field-days/:date')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  patchDay(@Param('date') date: string, @Body() dto: PatchDayDto) {
    return this.harvest.patchFieldDay(date, dto);
  }

  @Get('stats/today')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  stats() {
    return this.harvest.statsToday();
  }

  @Get('health')
  health() {
    return { ok: true, service: 'bancal' };
  }
}
