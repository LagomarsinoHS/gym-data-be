import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from 'cloudinary';

export type UploadImageInput = {
  buffer: Buffer;
  folder?: string;
  publicId?: string;
  /** When true, replaces an existing asset with the same publicId. */
  overwrite?: boolean;
};

export type UploadImageResult = {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
};

type DestroyResult = {
  result: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  /** Upload — cloudinary.uploader.upload_stream(...) */
  async uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
    const result = await this.uploadBuffer(input);

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  }

  /** Delete one — cloudinary.uploader.destroy(publicId) */
  async deleteImage(publicId: string, options?: { ignoreNotFound?: boolean }): Promise<void> {
    const result = (await cloudinary.uploader.destroy(publicId)) as DestroyResult;

    if (result.result === 'not found') {
      if (options?.ignoreNotFound) {
        return;
      }
      throw new NotFoundException(`Image not found: ${publicId}`);
    }

    if (result.result !== 'ok') {
      this.logger.warn(`Unexpected Cloudinary delete result: ${result.result}`);
      throw new Error(`Failed to delete image: ${result.result}`);
    }
  }

  /**
   * Deletes all resources under a folder prefix, then the empty folder.
   * Uses Admin API: delete_resources_by_prefix + delete_folder.
   */
  async deleteFolder(folder: string): Promise<void> {
    await cloudinary.api.delete_resources_by_prefix(folder);

    try {
      await cloudinary.api.delete_folder(folder);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown folder delete error';
      this.logger.warn(`Cloudinary delete_folder(${folder}): ${message}`);
    }
  }

  private uploadBuffer(input: UploadImageInput): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: input.folder,
          public_id: input.publicId,
          resource_type: 'image',
          overwrite: input.overwrite ?? false,
          invalidate: input.overwrite ?? false,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }
          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(input.buffer);
    });
  }
}
