import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobStatus, JobLocationType } from '@court-workflow/shared';
import { User } from '../../users/entities/user.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'case_name', type: 'varchar', length: 255 })
  caseName: string;

  @Column({ type: 'integer' })
  duration: number; // in minutes

  @Column({ name: 'location_type', type: 'enum', enum: JobLocationType })
  locationType: JobLocationType;

  @Column({ name: 'location_city', type: 'varchar', length: 100, nullable: true })
  locationCity: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.NEW })
  status: JobStatus;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId: string;

  @Column({ name: 'editor_id', type: 'uuid', nullable: true })
  editorId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'editor_id' })
  editor: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
