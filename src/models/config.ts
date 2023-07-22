import { z } from "zod"

export const RawConfig = z.object({
    token: z.string()
})
export type RawConfig = z.infer<typeof RawConfig>
