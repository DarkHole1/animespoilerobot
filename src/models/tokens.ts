import { z } from "zod";

export const RawTokens = z.record(z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    valid_until: z.number()
}))
export type RawTokens = z.infer<typeof RawTokens>