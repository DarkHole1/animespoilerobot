import { z } from "zod";

export const RawTokenResponse = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
    refresh_token: z.string(),
    scope: z.string(),
    created_at: z.number()
})
export type RawTokenResponse = z.infer<typeof RawTokenResponse>