import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('smtp.host'),
          port: configService.get<number>('smtp.port'),
          auth: {
            user: configService.get<string>('smtp.user'),
            pass: configService.get<string>('smtp.password'),
          },
        },
        defaults: {
          from: configService.get<string>('smtp.from'),
        },
      }),
    }),
  ],
})
export class MailModule {}
