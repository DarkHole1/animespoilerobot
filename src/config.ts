import { readFileSync } from "fs"
import { RawConfig } from "./models/config"

export class Config implements RawConfig {
    token: string

    private constructor(config: RawConfig) {
        this.token = config.token
    }

    static loadSync(filename: string) {
        const contents = readFileSync(filename, { encoding: 'utf-8' })
        const json = JSON.parse(contents)
        const parsed = RawConfig.parse(json)
        return new this(parsed)
    }
}