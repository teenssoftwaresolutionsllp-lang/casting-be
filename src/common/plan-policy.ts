/**
 * PLAN POLICY
 *
 * Think of this file as a rule book.
 * Every like / comment / profile-scroll check reads numbers from HERE.
 * The phone app cannot change these numbers.
 *
 * YOU MUST: change the prices and limits below if your product owner wants different values.
 */

export type PlanName = 'free' | 'pro' | 'pro_max';

export type PlanLimits = {
  likesPerDay: number;
  commentsPerDay: number;
  profileViewsPerDay: number;
  profileScrollsPerDay: number;
};

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  // Free = no payment. Small numbers on purpose.
  free: {
    likesPerDay: 20,
    commentsPerDay: 2,
    profileViewsPerDay: 5,
    profileScrollsPerDay: 20,
  },
  // YOU MUST: confirm these Pro numbers with the business team.
  pro: {
    likesPerDay: 200,
    commentsPerDay: 30,
    profileViewsPerDay: 100,
    profileScrollsPerDay: 100,
  },
  // YOU MUST: confirm these Pro Max numbers with the business team.
  pro_max: {
    likesPerDay: 500,
    commentsPerDay: 100,
    profileViewsPerDay: 500,
    profileScrollsPerDay: 500,
  },
};

/**
 * Money the user must pay for each plan.
 * amountPaise = rupees * 100  (Razorpay wants paise, not rupees)
 *
 * YOU MUST: put your real prices here (and match them in the Razorpay dashboard if you use plans there).
 */
export const PLAN_PRICES: Record<Exclude<PlanName, 'free'>, { amountPaise: number; currency: string; label: string }> = {
  pro: { amountPaise: 49900, currency: 'INR', label: 'Pro' },
  pro_max: { amountPaise: 99900, currency: 'INR', label: 'Pro Max' },
};

// How long a paid plan stays active after a successful payment.
export const PAID_PERIOD_DAYS = 30;

export function isPaidPlan(plan: string): plan is Exclude<PlanName, 'free'> {
  return plan === 'pro' || plan === 'pro_max';
}

export function parsePlanName(value: string | null | undefined): PlanName {
  if (value === 'pro' || value === 'pro_max' || value === 'free') {
    return value;
  }
  return 'free';
}

/**
 * Free comments rule (only for free users):
 * - Every 20 likes today unlocks 2 comments.
 * - Never more than 2 comments per day.
 *
 * Examples:
 *   0 likes  -> 0 comments allowed
 *   19 likes -> 0 comments allowed
 *   20 likes -> 2 comments allowed
 */
export function getFreeCommentLimit(likesUsedToday: number): number {
  const unlocked = Math.floor(likesUsedToday / 20) * 2;
  return Math.min(PLAN_LIMITS.free.commentsPerDay, unlocked);
}
