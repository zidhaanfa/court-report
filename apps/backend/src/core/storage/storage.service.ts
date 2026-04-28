import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('minio.endpoint');
    const accessKeyId = this.configService.get<string>('minio.accessKey');
    const secretAccessKey = this.configService.get<string>('minio.secretKey');
    const useSSL = this.configService.get<boolean>('minio.useSSL', false);
    const region = this.configService.get<string>('minio.region', 'us-east-1');
    this.bucket = this.configService.get<string>('minio.bucket') as string;

    const protocol = useSSL ? 'https' : 'http';

    this.s3Client = new S3Client({
      region,
      endpoint: `${protocol}://${endpoint}`,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3/MinIO: ${error.message}`);
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete file from S3/MinIO: ${error.message}`);
      throw error;
    }
  }
}
