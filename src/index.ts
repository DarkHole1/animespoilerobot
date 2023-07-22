import { Bot, Context, session, SessionFlavor } from "grammy"
import { InputMediaAudio, InputMedia, InputMediaDocument, InputMediaPhoto, InputMediaVideo } from "grammy/types"
import { Config } from "./config"

const config = Config.loadSync('./config.json')

type Message = MessageText | InputMedia | MediaGroup
type MessageText = {
    type: 'text',
    text: string
}
type MediaGroup = {
    type: 'media_group',
    media_group_id: string
    messages: (InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo)[]
}

interface SessionData {
    chat_id: number,
    messages: Message[]
}
type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(config.token)
bot.use(session({ initial: () => ({ chat_id: 0, messages: [] as Message[] }) }))

bot.on('msg', async ctx => {
    console.log(ctx.session)
    let media: InputMedia | null = null
    if (ctx.msg.photo) {
        media = {
            type: 'photo',
            media: ctx.msg.photo.slice(-1)[0].file_id,
            caption: ctx.msg.caption
        }
    }

    if (ctx.msg.video) {
        media = {
            type: 'video',
            media: ctx.msg.video.file_id,
            caption: ctx.msg.caption
        }
    }

    if (ctx.msg.animation) {
        media = {
            type: 'document',
            media: ctx.msg.animation.file_id,
            caption: ctx.msg.caption
        }
    }

    if (ctx.msg.audio) {
        media = {
            type: 'audio',
            media: ctx.msg.audio.file_id,
            caption: ctx.msg.caption
        }
    }

    if (media) {
        if (ctx.msg.media_group_id) {
            const last = ctx.session.messages.slice(-1)[0]
            if (last && last.type == 'media_group' && last.media_group_id == ctx.msg.media_group_id) {
                last.messages.push(media)
            } else {
                ctx.session.messages.push({
                    type: 'media_group',
                    media_group_id: ctx.msg.media_group_id,
                    messages: [media]
                })
            }
            return
        }

        ctx.session.messages.push(media)
        return
    }
    if (ctx.msg.text) {
        ctx.session.messages.push({
            type: 'text',
            text: ctx.msg.text
        })
        return
    }
    await ctx.reply('Похоже ты мне отправил что-то странное')
})

bot.start()
