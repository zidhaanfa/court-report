import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobStatus } from '@court-workflow/shared';
import { Job } from './job.entity';
import { User } from '../../users/entities/user.entity';

@Entity('job_status_logs')
export class JobStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({ name: 'from_status', type: 'enum', enum: JobStatus, nullable: true })
  fromStatus: JobStatus;

  @Column({ name: 'to_status', type: 'enum', enum: JobStatus })
  toStatus: JobStatus;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}
