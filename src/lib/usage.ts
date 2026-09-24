import { supabase } from "./supabase";

export const DAILY_PROCESSING_LIMIT = 5;

export type UsageCheck = {
  allowed: boolean;
  used: number;
  remaining: number;
};

export async function consumeProcessingJob(limit = DAILY_PROCESSING_LIMIT): Promise<UsageCheck> {
  const { data, error } = await supabase.rpc("consume_processing_job", {
    p_daily_limit: limit,
  });

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Unable to check today's processing limit.");

  return {
    allowed: Boolean(result.allowed),
    used: Number(result.used ?? 0),
    remaining: Number(result.remaining ?? 0),
  };
}
