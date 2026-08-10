/** Stable API error codes for client i18n. Keep English `message` as fallback/debug. */
export enum ApiErrorCode {
  CoachAthleteQuotaFull = 'COACH_ATHLETE_QUOTA_FULL',
  /** @deprecated Prefer inviting by email even if the athlete has not registered yet. Kept for wrong-role emails. */
  AthleteNotFoundByEmail = 'ATHLETE_NOT_FOUND_BY_EMAIL',
  EmailNotAnAthlete = 'EMAIL_NOT_AN_ATHLETE',
  AthleteHasPendingInvite = 'ATHLETE_HAS_PENDING_INVITE',
  NoPendingCoachInvite = 'NO_PENDING_COACH_INVITE',
  CurrentPasswordIncorrect = 'CURRENT_PASSWORD_INCORRECT',
  AiNotConfigured = 'AI_NOT_CONFIGURED',
  AiRequestFailed = 'AI_REQUEST_FAILED',
  PaidSubscriptionRequired = 'PAID_SUBSCRIPTION_REQUIRED',
}
