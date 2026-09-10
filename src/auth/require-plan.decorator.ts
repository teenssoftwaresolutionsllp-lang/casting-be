import { SetMetadata } from '@nestjs/common';
import { PlanName } from '../common/plan-policy';

export const REQUIRE_PLAN_KEY = 'requirePlan';

/**
 * YOU MUST: put this on any new route that should be premium-only.
 * Example: @RequirePlan('pro')  or  @RequirePlan('pro_max')
 */
export const RequirePlan = (plan: Exclude<PlanName, 'free'>) => SetMetadata(REQUIRE_PLAN_KEY, plan);
