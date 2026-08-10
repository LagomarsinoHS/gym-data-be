import { SubscriptionPlan } from './subscription-plan.enum';

/** Coach plans only. Athletes use `free` | `premium`. */
export type CoachSubscriptionPlan =
  SubscriptionPlan.Free | SubscriptionPlan.Growth | SubscriptionPlan.Pro;

/** Max assigned athletes (coachId set) per coach plan. */
export const COACH_ATHLETE_LIMITS: Record<CoachSubscriptionPlan, number> = {
  [SubscriptionPlan.Free]: 5,
  [SubscriptionPlan.Growth]: 10,
  [SubscriptionPlan.Pro]: 20,
};

export function isPaidSubscriptionPlan(plan: SubscriptionPlan): boolean {
  return plan !== SubscriptionPlan.Free;
}

export function getCoachAthleteLimit(plan: SubscriptionPlan): number {
  if (plan === SubscriptionPlan.Premium) {
    return COACH_ATHLETE_LIMITS[SubscriptionPlan.Free];
  }
  return COACH_ATHLETE_LIMITS[plan];
}
