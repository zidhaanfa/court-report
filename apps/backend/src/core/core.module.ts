import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../config/configuration';
import { validationSchema } from '../config/validation';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    StorageModule,
    MailModule,
  ],
  exports: [ConfigModule, DatabaseModule, StorageModule, MailModule],
})
export class CoreModule {}
