import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invite, InviteDocument } from '../schemas/invite.schema';
import type { CreateInviteData } from '../types/create-invite-data.type';
import { InviteStatus } from '../types/invite-status.enum';

@Injectable()
export class InvitesRepository {
  constructor(
    @InjectModel(Invite.name)
    private readonly inviteModel: Model<InviteDocument>,
  ) {}

  create(data: CreateInviteData): Promise<InviteDocument> {
    return this.inviteModel.create({
      status: InviteStatus.Pending,
      respondedAt: null,
      ...data,
    });
  }

  findById(id: string): Promise<InviteDocument | null> {
    return this.inviteModel.findOne({ id }).exec();
  }

  findPendingByCoachId(coachId: string): Promise<InviteDocument[]> {
    return this.inviteModel
      .find({ coachId, status: InviteStatus.Pending })
      .sort({ invitedAt: -1 })
      .exec();
  }

  async findByCoachId(
    coachId: string,
    skip: number,
    limit: number,
    status?: InviteStatus,
  ): Promise<{ invites: InviteDocument[]; total: number }> {
    const filter: { coachId: string; status?: InviteStatus } = { coachId };
    if (status) filter.status = status;

    const [invites, total] = await Promise.all([
      this.inviteModel
        .find(filter)
        .sort({ invitedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.inviteModel.countDocuments(filter).exec(),
    ]);

    return { invites, total };
  }

  findPendingByAthleteId(athleteId: string): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOne({ athleteId, status: InviteStatus.Pending })
      .exec();
  }

  async updateStatus(
    id: string,
    status: Exclude<InviteStatus, InviteStatus.Pending>,
    respondedAt: Date = new Date(),
  ): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOneAndUpdate(
        { id, status: InviteStatus.Pending },
        { $set: { status, respondedAt } },
        { new: true },
      )
      .exec();
  }

  async updatePendingByAthleteId(
    athleteId: string,
    status: Exclude<InviteStatus, InviteStatus.Pending>,
    respondedAt: Date = new Date(),
  ): Promise<InviteDocument | null> {
    return this.inviteModel
      .findOneAndUpdate(
        { athleteId, status: InviteStatus.Pending },
        { $set: { status, respondedAt } },
        { new: true },
      )
      .exec();
  }
}
