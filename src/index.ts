import { Bot } from "grammy"
import { Config } from "./config"

const config = Config.loadSync('./config.json')
const bot = new Bot(config.token)



bot.on('msg', async ctx => {
    console.log(ctx.msg)
    await ctx.reply('Gotcha', { reply_to_message_id: ctx.msg.message_id })
    await sleep(1000)
    await bot.api.copyMessage(ctx.chat.id, ctx.chat.id, ctx.msg.message_id)
})

bot.start()

function sleep(t: number): Promise<void> {
    return new Promise(res => setTimeout(res, t))
}