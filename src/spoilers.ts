import { readFileSync } from "fs"
import { writeFile } from "fs/promises"
import { RawSpoilers } from "./models/spoilers"
import { v4 as uuid } from "uuid"
import { InputMedia, InputMediaAudio, InputMediaDocument, InputMediaPhoto, InputMediaVideo } from "@grammyjs/types"

export type Message = MessageText | InputMedia<never> | MediaGroup
type MessageText = {
    type: 'text',
    text: string
}
type MediaGroup = {
    type: 'media_group',
    media_group_id: string
    messages: (InputMediaAudio<never> | InputMediaDocument<never> | InputMediaPhoto<never> | InputMediaVideo<never>)[]
}
export type SpoilerData = {
    anime_id: number,
    episode: number,
    messages: Message[]
}

export class Spoilers {
    private data: RawSpoilers

    private constructor(data: RawSpoilers) {
        this.data = data
    }

    static loadSync(filename: string) {
        const content = readFileSync(filename, { encoding: 'utf-8' })
        const json = JSON.parse(content)
        const parsed = RawSpoilers.parse(json)
        return new this(parsed)
    }

    async save(filename: string) {
        const content = JSON.stringify(this.data)
        await writeFile(filename, content)
    }

    get(spoiler_id: string): SpoilerData | undefined {
        return this.data[spoiler_id]
    }

    create(data: SpoilerData): string {
        const spoiler_id = uuid()
        this.data[spoiler_id] = data
        return spoiler_id
    }
}