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
    phase: 'start' | 'content' | 'title' | 'episode',
    chat_id: number,
    anime_id: number
    messages: Message[]
}
type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(config.token)
bot.use(session({ initial: (): SessionData => ({ phase: 'start', chat_id: 0, anime_id: 0, messages: [] }) }))

bot.command('start', async ctx => {
    ctx.session.phase = 'content'
    await ctx.reply('Приступаем к созданию спойлера. Отправляй мне всё - текст, картинки и гифки, а я это запомню на будущее. Когда решишь что достаточно, отправь /finish. А если передума - то /cancel')
})

bot.command('cancel', async ctx => {
    ctx.session.phase = 'start'
    ctx.session.messages = []
    ctx.session.chat_id = 0
    ctx.session.anime_id = 0
    await ctx.reply('Ну передумали так передумали чо бубнить то')
})

const contentPhase = bot.filter(ctx => ctx.session.phase == 'content')

contentPhase.command('finish', async ctx => {
    ctx.session.phase = 'title'
    await ctx.reply('Отлично! Теперь отправь мне ссылку на тайтл на Шикимори (можешь воспользовать @radionoisebot)')
})

contentPhase.on('msg', async ctx => {
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

bot.filter(ctx => ctx.session.phase == 'title').on('msg', async ctx => {
    for (const entity of ctx.entities('url')) {
        if (entity.text.startsWith('https://shikimori.me/animes/')) {
            const anime_id = parseInt(entity.text.slice('https://shikimori.me/animes/'.length))
            ctx.session.anime_id = anime_id
            ctx.session.phase = 'episode'
            await ctx.reply('А теперь выберите серию, к которой спойлер. Если вы хотите минимум ограничений, то можете написать 0')
            return
        }
    }
    await ctx.reply('Кажется в вашем сообщении нет ссылки на тайтл на Шики')
})

bot.filter(ctx => ctx.session.phase == 'episode').on('msg', async ctx => {
    if (!ctx.msg.text) return
    const match = ctx.msg.text.match(/^\d+$/)
    if (!match) {
        await ctx.reply('Похоже вы отправили не число. Попробуйте снова, мур')
        return
    }
    const episode = parseInt(ctx.msg.text)
    // TODO
    await sendMessages(ctx.chat.id, ctx.session.messages)
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
