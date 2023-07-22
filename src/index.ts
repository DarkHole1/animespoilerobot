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
    enabled: boolean,
    chat_id: number,
    messages: Message[]
}
type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(config.token)
bot.use(session({ initial: (): SessionData => ({ enabled: false, chat_id: 0, messages: [] }) }))

bot.command('finish', async ctx => {
    await sendMessages(ctx.chat.id, ctx.session.messages)
    ctx.session.messages = []
    ctx.session.enabled = false
})

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

    if (ctx.msg.document) {
        media = {
            type: 'document',
            media: ctx.msg.document.file_id,
            caption: ctx.msg.caption
        }
    }

    if (ctx.msg.animation) {
        media = {
            type: 'animation',
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
        if (ctx.msg.media_group_id && media.type != 'animation') {
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

    console.log(ctx.msg)
    await ctx.reply('Похоже ты мне отправил что-то странное')
})

bot.start()

async function sendMessages(chat_id: number, messages: Message[]) {
    for (const message of messages) {
        switch (message.type) {
            case 'animation':
                await bot.api.sendAnimation(chat_id, message.media, {
                    caption: message.caption
                })
                break
            case 'audio':
                await bot.api.sendAudio(chat_id, message.media, {
                    caption: message.caption
                })
                break
            case 'document':
                await bot.api.sendDocument(chat_id, message.media, {
                    caption: message.caption
                })
                break
            case 'media_group':
                await bot.api.sendMediaGroup(chat_id, message.messages)
                break
            case 'photo':
                await bot.api.sendPhoto(chat_id, message.media, {
                    caption: message.caption
                })
                break
            case 'text':
                await bot.api.sendMessage(chat_id, message.text)
                break
            case 'video':
                await bot.api.sendVideo(chat_id, message.media, {
                    caption: message.caption
                })
                break
        }
    }
}
