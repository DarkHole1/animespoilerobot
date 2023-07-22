import { Bot } from "grammy"
import { Config } from "./config"

const config = Config.loadSync('./config.json')
const bot = new Bot(config.token)

bot.on('msg', ctx => {
    console.log(ctx.msg)
    return ctx.reply('Gotcha', { reply_to_message_id: ctx.msg.message_id })
})

bot.start()