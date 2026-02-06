import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !endpoint ||
      !bucketName ||
      !publicBaseUrl
    ) {
      throw new Error('Missing required R2 configuration');
    }

    this.bucketName = bucketName;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');

    this.client = new S3Client({
      region: process.env.R2_REGION ?? 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  getPublicBaseUrl(): string {
    return this.publicBaseUrl;
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  async uploadObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async deleteObject(params: { key: string }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
      }),
    );
  }

  async listObjects(params: {
    prefix: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    items: Array<{ key: string; size?: number; lastModified?: Date }>;
    nextCursor?: string;
  }> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: params.prefix,
        MaxKeys: params.limit,
        ContinuationToken: params.cursor,
      }),
    );

    const items: Array<{ key: string; size?: number; lastModified?: Date }> = [];

    for (const item of response.Contents ?? []) {
      if (!item.Key) {
        continue;
      }

      items.push({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
      });
    }

    return {
      items,
      nextCursor: response.IsTruncated
        ? response.NextContinuationToken ?? undefined
        : undefined,
    };
  }
}
