/** Stable API error codes for client i18n. Keep English `message` as fallback/debug. */
export enum ApiErrorCode {
  CoachAthleteQuotaFull = 'COACH_ATHLETE_QUOTA_FULL',
  EmailNotAnAthlete = 'EMAIL_NOT_AN_ATHLETE',
  AthleteHasPendingInvite = 'ATHLETE_HAS_PENDING_INVITE',
  AlreadyYourAthlete = 'ALREADY_YOUR_ATHLETE',
  AthleteAlreadyHasCoach = 'ATHLETE_ALREADY_HAS_COACH',
  NoPendingCoachInvite = 'NO_PENDING_COACH_INVITE',
  CurrentPasswordIncorrect = 'CURRENT_PASSWORD_INCORRECT',
  AiRequestFailed = 'AI_REQUEST_FAILED',
  PaidSubscriptionRequired = 'PAID_SUBSCRIPTION_REQUIRED',
}
