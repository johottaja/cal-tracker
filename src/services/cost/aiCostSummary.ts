import { z } from 'zod';

import { nowUtc, type AiCostSummary } from '../../domain';
import { AuthenticationRequiredError } from '../estimation/nutritionEstimation';
import { getSupabaseClient } from '../supabase/client';

const usageCostRowSchema = z
  .object({
    created_at: z.string().datetime({ offset: true }),
    estimated_cost_micros_usd: z.number().int().nonnegative().safe(),
  })
  .strict();

const PAGE_SIZE = 500;

export async function getAiCostSummary(
  now = new Date(),
): Promise<AiCostSummary> {
  if (Number.isNaN(now.getTime())) throw new Error('Invalid summary date');
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new AuthenticationRequiredError();

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows: z.infer<typeof usageCostRowSchema>[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('ai_usage_events')
      .select('created_at, estimated_cost_micros_usd')
      .eq('user_id', user.id)
      .gte('created_at', yearStart.toISOString())
      .lt('created_at', nextYearStart.toISOString())
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = z.array(usageCostRowSchema).parse(data);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const monthStartTime = monthStart.getTime();
  let monthCostMicrosUsd = 0;
  let yearCostMicrosUsd = 0;
  for (const row of rows) {
    yearCostMicrosUsd += row.estimated_cost_micros_usd;
    if (Date.parse(row.created_at) >= monthStartTime) {
      monthCostMicrosUsd += row.estimated_cost_micros_usd;
    }
  }
  if (
    !Number.isSafeInteger(monthCostMicrosUsd) ||
    !Number.isSafeInteger(yearCostMicrosUsd)
  ) {
    throw new Error('AI cost total exceeds the supported numeric range');
  }
  return {
    monthCostMicrosUsd,
    yearCostMicrosUsd,
    refreshedAt: nowUtc(),
  };
}
