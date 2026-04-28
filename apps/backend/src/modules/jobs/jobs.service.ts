import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobStatusLog } from './entities/job-status-log.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateJobDto,
  UpdateJobDto,
  AssignReporterDto,
  AssignEditorDto,
  UpdateStatusDto,
} from './dto/job.dto';
import {
  JobStatus,
  JobLocationType,
  AssignmentType,
  UserStatus,
} from '@court-workflow/shared';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ConfigService } from '@nestjs/config';
import { PaginationMeta } from '@court-workflow/shared';

// ── State Machine ────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.NEW]: [JobStatus.ASSIGNED],
  [JobStatus.ASSIGNED]: [JobStatus.TRANSCRIBED],
  [JobStatus.TRANSCRIBED]: [JobStatus.REVIEWED],
  [JobStatus.REVIEWED]: [JobStatus.COMPLETED],
  [JobStatus.COMPLETED]: [],
};

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(JobStatusLog)
    private readonly statusLogRepository: Repository<JobStatusLog>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    filters: { status?: JobStatus; reporterId?: string; editorId?: string } = {},
  ): Promise<{ data: Job[]; meta: PaginationMeta }> {
    const qb = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.reporter', 'reporter')
      .leftJoinAndSelect('job.editor', 'editor')
      .leftJoinAndSelect('job.creator', 'creator')
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters.reporterId) {
      qb.andWhere('job.reporterId = :reporterId', { reporterId: filters.reporterId });
    }
    if (filters.editorId) {
      qb.andWhere('job.editorId = :editorId', { editorId: filters.editorId });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: { reporter: true, editor: true, creator: true },
    });

    if (!job) throw new NotFoundException(`Job "${id}" not found`);
    return job;
  }

  async create(dto: CreateJobDto, currentUser: JwtPayload): Promise<Job> {
    if (
      dto.locationType === JobLocationType.PHYSICAL &&
      !dto.locationCity
    ) {
      throw new BadRequestException(
        'locationCity is required for PHYSICAL jobs',
      );
    }

    const job = this.jobRepository.create({
      caseName: dto.caseName,
      duration: dto.duration,
      locationType: dto.locationType,
      locationCity: dto.locationCity,
      createdBy: currentUser.sub,
    });

    return this.jobRepository.save(job);
  }

  async update(
    id: string,
    dto: UpdateJobDto,
    currentUser: JwtPayload,
  ): Promise<Job> {
    const job = await this.findOne(id);
    Object.assign(job, dto);
    return this.jobRepository.save(job);
  }

  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);

    if (job.status !== JobStatus.NEW) {
      throw new BadRequestException('Only NEW jobs can be deleted');
    }

    await this.jobRepository.remove(job);
  }

  async assignReporter(
    jobId: string,
    dto: AssignReporterDto,
    currentUser: JwtPayload,
  ): Promise<Job> {
    const job = await this.findOne(jobId);

    // 1. Job must be in NEW status
    if (job.status !== JobStatus.NEW) {
      throw new BadRequestException('Reporter can only be assigned to NEW jobs');
    }

    // 2. Reporter must have REPORTER role
    const reporter = await this.userRepository.findOne({
      where: { id: dto.reporterId },
      relations: { roles: true },
    });

    if (!reporter) throw new NotFoundException('Reporter not found');

    if (!reporter.roles.some((r) => r.name === 'REPORTER')) {
      throw new BadRequestException('User does not have the REPORTER role');
    }

    // 3. Reporter must be available
    if (!reporter.isAvailable || reporter.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Reporter is not available');
    }

    // 4. Physical job city check
    if (
      job.locationType === JobLocationType.PHYSICAL &&
      reporter.city?.toLowerCase() !== job.locationCity?.toLowerCase()
    ) {
      if (!dto.force) {
        throw new BadRequestException(
          `Reporter city "${reporter.city}" does not match job city "${job.locationCity}". Use force=true to override.`,
        );
      }
    }

    // 5. Assign reporter and transition status
    job.reporterId = reporter.id;
    job.status = JobStatus.ASSIGNED;
    await this.jobRepository.save(job);

    // 6. Log status change
    await this.logStatusChange(
      jobId,
      JobStatus.NEW,
      JobStatus.ASSIGNED,
      currentUser.sub,
      `Assigned reporter: ${reporter.fullName}`,
    );

    // 7. Auto-create PENDING payment for reporter
    await this.createPayment(
      jobId,
      reporter.id,
      AssignmentType.REPORTER,
      this.configService.get<number>('payment.reporterRatePerMinute') || 2000,
    );

    return this.findOne(jobId);
  }

  async assignEditor(
    jobId: string,
    dto: AssignEditorDto,
    currentUser: JwtPayload,
  ): Promise<Job> {
    const job = await this.findOne(jobId);

    // 1. Job must be in TRANSCRIBED status
    if (job.status !== JobStatus.TRANSCRIBED) {
      throw new BadRequestException(
        'Editor can only be assigned to TRANSCRIBED jobs',
      );
    }

    // 2. Editor must have EDITOR role
    const editor = await this.userRepository.findOne({
      where: { id: dto.editorId },
      relations: { roles: true },
    });

    if (!editor) throw new NotFoundException('Editor not found');

    if (!editor.roles.some((r) => r.name === 'EDITOR')) {
      throw new BadRequestException('User does not have the EDITOR role');
    }

    // 3. Editor must be available
    if (!editor.isAvailable || editor.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Editor is not available');
    }

    // 4. Assign editor (status stays TRANSCRIBED)
    job.editorId = editor.id;
    await this.jobRepository.save(job);

    // 5. Auto-create PENDING payment for editor
    await this.createPayment(
      jobId,
      editor.id,
      AssignmentType.EDITOR,
      this.configService.get<number>('payment.editorFlatRate') || 150000,
    );

    return this.findOne(jobId);
  }

  async updateStatus(
    jobId: string,
    dto: UpdateStatusDto,
    currentUser: JwtPayload,
  ): Promise<Job> {
    const job = await this.findOne(jobId);
    const newStatus = dto.status as JobStatus;

    // 1. Validate transition is allowed
    const allowedNext = ALLOWED_TRANSITIONS[job.status];
    if (!allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${newStatus}`,
      );
    }

    // 2. Validate caller permission per transition
    if (
      newStatus === JobStatus.TRANSCRIBED &&
      job.reporterId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Only the assigned reporter can mark this job as TRANSCRIBED',
      );
    }

    if (
      newStatus === JobStatus.REVIEWED &&
      job.editorId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Only the assigned editor can mark this job as REVIEWED',
      );
    }

    const fromStatus = job.status;
    job.status = newStatus;
    await this.jobRepository.save(job);

    // 3. Log status change
    await this.logStatusChange(
      jobId,
      fromStatus,
      newStatus,
      currentUser.sub,
      dto.note,
    );

    // 4. On COMPLETED — calculate and save payment amounts
    if (newStatus === JobStatus.COMPLETED) {
      await this.calculatePayments(job);
    }

    return this.findOne(jobId);
  }

  async findLogs(jobId: string): Promise<JobStatusLog[]> {
    await this.findOne(jobId); // ensure job exists
    return this.statusLogRepository.find({
      where: { jobId },
      relations: { changedByUser: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Private helpers ──────────────────────────────────────────

  private async logStatusChange(
    jobId: string,
    fromStatus: JobStatus | null,
    toStatus: JobStatus,
    changedBy: string,
    note?: string,
  ): Promise<void> {
    const log = this.statusLogRepository.create({
      jobId,
      fromStatus: fromStatus ?? undefined,
      toStatus,
      changedBy,
      note,
    });
    await this.statusLogRepository.save(log);
  }

  private async createPayment(
    jobId: string,
    userId: string,
    assignmentType: AssignmentType,
    rate: number,
  ): Promise<void> {
    const existing = await this.paymentRepository.findOne({
      where: { jobId, userId, assignmentType },
    });

    if (!existing) {
      const payment = this.paymentRepository.create({
        jobId,
        userId,
        assignmentType,
        rate,
        amount: 0, // calculated when COMPLETED
        status: 'PENDING' as any,
      });
      await this.paymentRepository.save(payment);
    }
  }

  private async calculatePayments(job: Job): Promise<void> {
    // Reporter payment: duration × rate
    if (job.reporterId) {
      const reporterPayment = await this.paymentRepository.findOne({
        where: {
          jobId: job.id,
          userId: job.reporterId,
          assignmentType: AssignmentType.REPORTER,
        },
      });

      if (reporterPayment) {
        reporterPayment.amount = job.duration * reporterPayment.rate;
        reporterPayment.durationUsed = job.duration;
        await this.paymentRepository.save(reporterPayment);
      }
    }

    // Editor payment: flat rate
    if (job.editorId) {
      const editorPayment = await this.paymentRepository.findOne({
        where: {
          jobId: job.id,
          userId: job.editorId,
          assignmentType: AssignmentType.EDITOR,
        },
      });

      if (editorPayment) {
        editorPayment.amount = editorPayment.rate;
        await this.paymentRepository.save(editorPayment);
      }
    }
  }
}
