import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';

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

export type StorageImage = {
  publicId: string;
  folder: string | null;
  format: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

type DestroyResult = {
  result: string;
};

type ResourceResponse = {
  public_id: string;
  folder?: string;
  format: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
};

type SearchResponse = {
  resources: ResourceResponse[];
  total_count: number;
  next_cursor?: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
      secure: true,
    });
  }

  /** 1. Upload — cloudinary.uploader.upload_stream(...) */
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

  /** 2. List folder — cloudinary.search.expression('folder:X').execute() */
  async listFolder(
    folder: string,
    options?: { maxResults?: number; nextCursor?: string },
  ): Promise<{
    images: StorageImage[];
    totalCount: number;
    nextCursor?: string;
  }> {
    const maxResults = options?.maxResults ?? 50;
    let search = cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by('created_at', 'desc')
      .max_results(maxResults);

    if (options?.nextCursor) {
      search = search.next_cursor(options.nextCursor);
    }

    const result = (await search.execute()) as SearchResponse;

    return {
      images: result.resources.map((resource) => this.toStorageImage(resource)),
      totalCount: result.total_count,
      nextCursor: result.next_cursor,
    };
  }

  /** 3. Get one — cloudinary.api.resource(publicId) */
  async getImage(publicId: string): Promise<StorageImage> {
    try {
      const resource = (await cloudinary.api.resource(publicId, {
        resource_type: 'image',
      })) as ResourceResponse;

      return this.toStorageImage(resource);
    } catch (error: unknown) {
      const httpCode =
        error && typeof error === 'object' && 'http_code' in error
          ? Number((error as { http_code: number }).http_code)
          : undefined;

      if (httpCode === 404) {
        throw new NotFoundException(`Image not found: ${publicId}`);
      }
      throw error;
    }
  }

  /** 4. Delete one — cloudinary.uploader.destroy(publicId) */
  async deleteImage(
    publicId: string,
    options?: { ignoreNotFound?: boolean },
  ): Promise<void> {
    const result = (await cloudinary.uploader.destroy(
      publicId,
    )) as DestroyResult;

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
      const message =
        error instanceof Error ? error.message : 'Unknown folder delete error';
      this.logger.warn(`Cloudinary delete_folder(${folder}): ${message}`);
    }
  }

  private toStorageImage(resource: ResourceResponse): StorageImage {
    return {
      publicId: resource.public_id,
      folder: resource.folder ?? null,
      format: resource.format,
      url: resource.url,
      secureUrl: resource.secure_url,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      createdAt: resource.created_at,
    };
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
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
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
