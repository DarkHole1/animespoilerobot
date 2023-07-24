import { readFileSync } from "fs"
import { RawConfig } from "./models/config"

export const config = RawConfig.parse(JSON.parse(readFileSync('./config.json', { encoding: 'utf-8' })))
