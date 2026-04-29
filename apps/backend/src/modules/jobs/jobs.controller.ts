import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import {
  CreateJobDto,
  UpdateJobDto,
  AssignReporterDto,
  AssignEditorDto,
  UpdateStatusDto,
} from './dto/job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { JobStatus } from '@court-workflow/shared';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: JobStatus,
    @Query('reporterId') reporterId?: string,
    @Query('editorId') editorId?: string,
  ) {
    return this.jobsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      { status, reporterId, editorId },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateJobDto, @CurrentUser() user: JwtPayload) {
    return this.jobsService.create(dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  @Post(':id/assign-reporter')
  @Roles('ADMIN', 'MANAGER')
  assignReporter(
    @Param('id') id: string,
    @Body() dto: AssignReporterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.assignReporter(id, dto, user);
  }

  @Post(':id/assign-editor')
  @Roles('ADMIN', 'MANAGER')
  assignEditor(
    @Param('id') id: string,
    @Body() dto: AssignEditorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.assignEditor(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.updateStatus(id, dto, user);
  }

  @Get(':id/logs')
  @Roles('ADMIN', 'MANAGER')
  getLogs(@Param('id') id: string) {
    return this.jobsService.findLogs(id);
  }
}
