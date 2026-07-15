import { z } from 'zod';

import type { NutritionEstimate } from '../../domain';
import { getSupabaseClient } from '../supabase/client';

const MAX_IMAGE_BASE64_LENGTH = 5_600_000;

export const nutritionEstimateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    calories: z.number().int().min(0).max(10_000),
    protein_g: z.number().finite().min(0).max(2_000),
    carbs_g: z.number().finite().min(0).max(2_000),
    fat_g: z.number().finite().min(0).max(2_000),
    confidence: z.enum(['low', 'medium', 'high']),
    assumptions: z.string().trim().min(1).max(500),
  })
  .strict();

const textRequestSchema = z
  .object({
    type: z.literal('text'),
    description: z.string().trim().min(1).max(2_000),
  })
  .strict();

const photoRequestSchema = z
  .object({
    type: z.literal('photo'),
    imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    caption: z.string().trim().max(500).optional(),
  })
  .strict();

export type NutritionEstimationRequest =
  | z.input<typeof textRequestSchema>
  | z.input<typeof photoRequestSchema>;

export interface NutritionEstimationOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Sign in to use nutrition estimates');
    this.name = 'AuthenticationRequiredError';
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  let {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new AuthenticationRequiredError();

  if (
    session.expires_at &&
    session.expires_at * 1_000 <= Date.now() + 60_000
  ) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
  }
  if (!session?.access_token) throw new AuthenticationRequiredError();
  return session.access_token;
}

export async function estimateNutrition(
  request: NutritionEstimationRequest,
  options: NutritionEstimationOptions = {},
): Promise<NutritionEstimate> {
  const parsedRequest =
    request.type === 'text'
      ? textRequestSchema.parse(request)
      : photoRequestSchema.parse(request);
  const functionBody =
    parsedRequest.type === 'text'
      ? {
          source: 'text' as const,
          text: parsedRequest.description,
        }
      : {
          source: 'photo' as const,
          image_base64: parsedRequest.imageBase64,
          image_mime_type: parsedRequest.mimeType,
          ...(parsedRequest.caption ? { text: parsedRequest.caption } : {}),
        };
  const accessToken = await getAccessToken();
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'estimate-nutrition',
    {
      body: functionBody,
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.timeoutMs === undefined
        ? {}
        : { timeout: options.timeoutMs }),
    },
  );
  if (error) throw error;

  const estimate = nutritionEstimateSchema.parse(data);
  return {
    name: estimate.name,
    calories: estimate.calories,
    proteinG: Math.round(estimate.protein_g * 10) / 10,
    carbsG: Math.round(estimate.carbs_g * 10) / 10,
    fatG: Math.round(estimate.fat_g * 10) / 10,
    confidence: estimate.confidence,
    assumptions: estimate.assumptions,
  };
}
