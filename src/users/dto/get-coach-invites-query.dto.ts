import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { PaginationQueryDto, paginationQueryKeys } from '../../common/dto/pagination-query.dto';
import { InviteStatus } from '../types/invite-status.enum';

export class GetCoachInvitesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: InviteStatus,
    description: 'Filter by status. Omit for all invites.',
  })
  status?: InviteStatus;
}

export const getCoachInvitesQuerySchema = Joi.object<GetCoachInvitesQueryDto>({
  ...paginationQueryKeys,
  status: Joi.string()
    .valid(...Object.values(InviteStatus))
    .optional(),
});
