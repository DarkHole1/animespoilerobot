import { number, z } from "zod"

export const RawSpoilers = z.record(z.object({
    anime_id: z.number().int(),
    episode: z.number().int(),
    messages: z.array(z.union([
        z.object({
            type: z.literal('text'),
            text: z.string()
        }),
        z.object({
            type: z.literal('media_group'),
            media_group_id: z.string(),
            messages: z.array(z.object({
                type: z.union([
                    z.literal('audio'),
                    z.literal('video'),
                    z.literal('document'),
                    z.literal('photo')
                ]),
                media: z.string(),
                caption: z.string().optional()
            }))
        }),
        z.object({
            type: z.union([
                z.literal('audio'),
                z.literal('video'),
                z.literal('document'),
                z.literal('photo'),
                z.literal('animation')
            ]),
            media: z.string(),
            caption: z.string().optional()
        })
    ]))
}))

export type RawSpoilers = z.infer<typeof RawSpoilers>