import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  reporterRatePerMinute?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  editorFlatRate?: number;

  @IsString()
  @IsOptional()
  defaultRoleName?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentDueDays?: number;
}
