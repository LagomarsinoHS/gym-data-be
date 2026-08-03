/** Stable API error codes for client i18n. Keep English `message` as fallback/debug. */
export enum ApiErrorCode {
  CoachAthleteQuotaFull = 'COACH_ATHLETE_QUOTA_FULL',
  AthleteNotFoundByEmail = 'ATHLETE_NOT_FOUND_BY_EMAIL',
  AthleteHasPendingInvite = 'ATHLETE_HAS_PENDING_INVITE',
  NoPendingCoachInvite = 'NO_PENDING_COACH_INVITE',
}
