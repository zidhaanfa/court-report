import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getSettings(): Promise<Setting> {
    let setting = await this.settingRepository.createQueryBuilder().getOne();

    if (!setting) {
      // Create default settings if none exist
      setting = this.settingRepository.create({
        reporterRatePerMinute: 50000,
        editorFlatRate: 500000,
        defaultRoleName: 'REPORTER',
        paymentDueDays: 30,
      });
      setting = await this.settingRepository.save(setting);
    }

    return setting;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto): Promise<Setting> {
    const setting = await this.getSettings();

    Object.assign(setting, updateSettingsDto);

    return this.settingRepository.save(setting);
  }
}
