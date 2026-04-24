// app/services/s3_services.ts

import Drive from '@adonisjs/drive/services/main'
// import { string } from '@adonisjs/core/helpers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { readFile } from 'node:fs/promises'
import env from '#start/env'

export default class StorageService {
  static async upload(
    feature: 'products' | 'companies' | 'invoices' | 'payments' | 'settings' | 'users',
    type: 'public' | 'private',
    file: any
  ) {
    console.log('Uploading file to S3:', {
      originalName: file?.clientName,
      size: file?.size,
      tmpPath: file?.tmpPath,
      type: file?.type,
      subtype: file?.subtype,
      extname: file?.extname,
    })

    if (!file?.tmpPath) {
      throw new Error('File tmpPath tidak ditemukan. Pastikan menggunakan vine.file()')
    }

    const randomString = Math.random().toString(36).substring(2, 7).toUpperCase()
    const filename = `${randomString}.${file.extname}`
    const key = `${feature}/${type}/${filename}`
    const disk = Drive.use('s3')
    // const disk = Drive.use(type === 'public' ? 's3' : 's3Private')

    // Content-type dengan fallback
    const contentType = file?.type && file?.subtype
      ? `${file.type}/${file.subtype}`
      : 'application/octet-stream'

    try {
      // Baca file sebagai buffer
      const buffer = await readFile(file.tmpPath)

      // Upload dengan visibility sesuai type
      await disk.put(key, buffer, {
        contentType
      })

      console.log('✅ File uploaded to S3:', key)

      // Generate URL
      let url: string | null = null

      if (type === 'public') {
        url = await disk.getUrl(key)
      } else {
        // Untuk private, return null atau signed URL langsung
        // url = await disk.getSignedUrl(key, { expiresIn: 3600 })
        url = key
      }

      console.log('📎 URL:', url)

      return {
        path: key,
        url: url,
      }
    } catch (err: any) {
      console.error('❌ S3 upload failed:', {
        name: err?.name,
        code: err?.code,
        message: err?.message,
        originalCause: err?.cause, // This contains the REAL S3 error
        stack: err?.stack,
        $metadata: err?.$metadata,
      })
      throw new Error(`S3 Upload gagal: ${err?.message || 'Unknown error'}`)
    }
  }

  static async update(
    feature: 'products' | 'companies' | 'invoices' | 'payments' |  'settings' | 'settings',
    type: 'public' | 'private',
    oldPath: string | null,
    file: any
  ) {
    const disk = Drive.use('s3')

    try {
      // Hapus file lama jika ada
      if (oldPath) {
        console.log('🗑️ Deleting old file:', oldPath)
        await disk.delete(oldPath).catch((err) => {
          console.warn('⚠️ Could not delete old file:', err?.message)
        })
      }

      // Upload file baru
      const result = await this.upload(feature, type, file)
      console.log('✅ New file uploaded:', result.path)
      return result
    } catch (error: any) {
      console.error('❌ S3 update failed:', error)
      throw error
    }
  }

  static async getSignedUrl(
    feature: 'products' | 'companies' | 'invoices' | 'payments',
    filename: string,
    expiresIn?: number
  ) {
    const key = `${feature}/private/${filename}`
    return Drive.use('s3').getSignedUrl(key, { expiresIn: expiresIn ?? 3600 })
  }

  static async deleteFile(path: string) {
    try {
      await Drive.use('s3').delete(path)
      console.log('✅ File deleted:', path)
    } catch (error: any) {
      console.error('❌ Delete failed:', error?.message)
      throw error
    }
  }
}

// S3 Client untuk signed URL download
export const s3 = new S3Client({
  region: env.get('AWS_REGION', 'us-east-1'),
  endpoint: env.get('S3_ENDPOINT'),
  credentials: {
    accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: true, // WAJIB untuk MinIO
})

export async function getDownloadSignedUrl(
  bucket: string,
  key: string,
  filename: string,
  contentType?: string
) {
  const asciiName = filename.replace(/[^\x20-\x7E]+/g, '_')
  const encodedName = encodeURIComponent(filename)

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: contentType ?? 'application/octet-stream',
    ResponseContentDisposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
  })

  return getSignedUrl(s3, cmd, { expiresIn: 3600 })
}
