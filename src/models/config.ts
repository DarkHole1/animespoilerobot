import { z } from "zod"

export const RawConfig = z.object({
    telegram: z.object({
        token: z.string(),
        username: z.string()
    })
})
export type RawConfig = z.infer<typeof RawConfig>
