import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 50000 })
  reporterRatePerMinute: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 500000 })
  editorFlatRate: number;

  @Column({ type: 'varchar', length: 50, default: 'REPORTER' })
  defaultRoleName: string;

  @Column({ type: 'int', default: 30 })
  paymentDueDays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
