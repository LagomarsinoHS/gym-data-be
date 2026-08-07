export enum SubscriptionPlan {
  Free = 'free',
  Premium = 'premium',
  Growth = 'growth',
  Pro = 'pro',
}

/** Plans accepted by `POST /admin/subscriptions/grant`. */
export const GRANTABLE_SUBSCRIPTION_PLANS = [
  SubscriptionPlan.Premium,
  SubscriptionPlan.Growth,
  SubscriptionPlan.Pro,
] as const;

export type GrantableSubscriptionPlan = (typeof GRANTABLE_SUBSCRIPTION_PLANS)[number];
