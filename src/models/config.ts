import { z } from "zod"

export const RawConfig = z.object({
    telegram: z.object({
        token: z.string(),
        username: z.string()
    }),
    shiki: z.object({
        client_id: z.string(),
        client_secret: z.string(),
        name: z.string()
    })
})
export type RawConfig = z.infer<typeof RawConfig>
