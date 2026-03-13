import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageStore, PutOptions, StorageMetadata } from '@gravito/nebula'

/**
 * S3Store 
 * 
 * 符合 @gravito/nebula 的 StorageStore 介面，使用 AWS S3
 */
export class S3Store implements StorageStore {
  private client: S3Client
  private bucket: string

  constructor(private config: {
    key: string
    secret: string
    bucket: string
    region: string
  }) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret,
      },
    })
    this.bucket = config.bucket
  }

  /**
   * 寫入檔案
   */
  async put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    let body: Buffer
    if (data instanceof Blob) {
      body = Buffer.from(await data.arrayBuffer())
    } else if (typeof data === 'string') {
      body = Buffer.from(data)
    } else {
      body = data
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
        CacheControl: options?.cacheControl,
        ContentDisposition: options?.contentDisposition,
      })
    )
  }

  /**
   * 讀取檔案
   */
  async get(key: string): Promise<Blob | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      if (!response.Body) return null
      
      const bytes = await response.Body.transformToByteArray()
      return new Blob([new Uint8Array(bytes)], { type: response.ContentType })
    } catch (error: any) {
      if (error.name === 'NoSuchKey') return null
      throw error
    }
  }

  /**
   * 刪除檔案
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * 檢查檔案是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * 複製檔案
   */
  async copy(from: string, to: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${from}`,
        Key: to,
      })
    )
  }

  /**
   * 移動檔案
   */
  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  /**
   * 獲取檔案元資料
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return {
        key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        customMetadata: response.Metadata,
      }
    } catch {
      return null
    }
  }

  /**
   * 獲取公開 URL
   */
  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
  }

  /**
   * 獲取簽名 URL
   */
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }
}
