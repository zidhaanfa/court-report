import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaymentStatus } from '@court-workflow/shared';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ADMIN/MANAGER: list all payments
  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PaymentStatus,
    @Query('userId') userId?: string,
  ) {
    return this.paymentsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      { status, userId },
    );
  }

  // REPORTER/EDITOR: own payments
  @Get('my')
  @Roles('REPORTER', 'EDITOR')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findMine(
      user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ADMIN/MANAGER: payments for a specific job
  @Get('job/:jobId')
  @Roles('ADMIN', 'MANAGER')
  findByJob(@Param('jobId') jobId: string) {
    return this.paymentsService.findByJob(jobId);
  }

  // ADMIN/MANAGER: payment detail
  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  // ADMIN/MANAGER: mark payment as paid
  @Patch(':id/mark-paid')
  @Roles('ADMIN', 'MANAGER')
  markPaid(@Param('id') id: string) {
    return this.paymentsService.markPaid(id);
  }
}
