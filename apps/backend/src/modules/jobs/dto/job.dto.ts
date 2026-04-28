import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { JobLocationType } from '@court-workflow/shared';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  caseName: string;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsEnum(JobLocationType)
  locationType: JobLocationType;

  @IsString()
  @IsOptional()
  locationCity?: string;
}

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  caseName?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  duration?: number;
}

export class AssignReporterDto {
  @IsString()
  @IsNotEmpty()
  reporterId: string;

  @IsOptional()
  force?: boolean; // MANAGER can override city constraint
}

export class AssignEditorDto {
  @IsString()
  @IsNotEmpty()
  editorId: string;
}

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  note?: string;
}
