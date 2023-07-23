import { readFileSync } from "fs"
import { RawConfig } from "./models/config"

export class Config implements RawConfig {
    telegram: {
        token: string,
        username: string
    }

    private constructor(config: RawConfig) {
        this.telegram = config.telegram
    }

    static loadSync(filename: string) {
        const contents = readFileSync(filename, { encoding: 'utf-8' })
        const json = JSON.parse(contents)
        const parsed = RawConfig.parse(json)
        return new this(parsed)
    }
}