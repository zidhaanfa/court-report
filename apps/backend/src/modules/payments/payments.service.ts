import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from '@court-workflow/shared';
import { PaginationMeta } from '@court-workflow/shared';
import type { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    filters: { status?: PaymentStatus; userId?: string } = {},
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.job', 'job')
      .leftJoinAndSelect('payment.user', 'user')
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters.userId) {
      qb.andWhere('payment.userId = :userId', { userId: filters.userId });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMine(
    currentUser: JwtPayload,
    page = 1,
    limit = 10,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    return this.findAll(page, limit, { userId: currentUser.sub });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: { job: true, user: true },
    });

    if (!payment) throw new NotFoundException(`Payment "${id}" not found`);
    return payment;
  }

  async findByJob(
    jobId: string,
  ): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { jobId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async markPaid(id: string): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment is already marked as paid');
    }

    payment.status = PaymentStatus.PAID;
    payment.paidAt = new Date();
    return this.paymentRepository.save(payment);
  }
}
