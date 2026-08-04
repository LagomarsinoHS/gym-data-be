import { BadRequestException, Injectable } from '@nestjs/common';
import {
  StorageService,
  type UploadImageResult,
} from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { MeResponseDto } from '../users/dto/me-response.dto';
import { GrantPremiumDto } from './dto/grant-premium.dto';
import { RevokePremiumDto } from './dto/revoke-premium.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_DAYS = 30;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** YYYY-MM-DD → end of that calendar day in UTC. */
function endOfUtcDay(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadImageResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type: ${file.mimetype}. Allowed: jpeg, png, webp, gif`,
      );
    }

    return this.storageService.uploadImage({
      buffer: file.buffer,
      folder: folder?.trim() || 'gym-app',
    });
  }

  async grantPremium(dto: GrantPremiumDto): Promise<MeResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    const expiresAt =
      dto.expiresAt != null
        ? endOfUtcDay(dto.expiresAt)
        : new Date(
            Date.now() +
              (dto.durationDays ?? DEFAULT_DURATION_DAYS) * MS_PER_DAY,
          );

    return this.usersService.grantSubscription(user.id, dto.plan, expiresAt);
  }

  async revokePremium(dto: RevokePremiumDto): Promise<MeResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    return this.usersService.revokePremium(user.id);
  }
}
