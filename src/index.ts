import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy"
import { guard, isPrivateChat, reply } from "grammy-guard"
import { Message, Spoilers } from "./spoilers"
import { InputMedia } from "@grammyjs/types"
import { config } from "./config"
import { getAuthorizedAPI, getOAuthUrl, loggedIn, treeDiagram } from "./aleister-crowley"
import express from 'express'
import path from 'path'


const spoilers = Spoilers.loadSync('./data/spoilers.json')

interface SessionData {
    phase: 'start' | 'content' | 'title' | 'episode',
    anime_id: number
    messages: Message[]
}
type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(config.telegram.token)
bot.use(session({ initial: (): SessionData => ({ phase: 'start', anime_id: 0, messages: [] }) }))

bot.command('start', guard(isPrivateChat, reply('Не, эта штука только в личных сообщениях работает')), async ctx => {
    if (ctx.match == 'create' || ctx.match == '') {
        ctx.session.phase = 'content'
        await ctx.reply('Приступаем к созданию спойлера. Отправляй мне всё - текст, картинки и гифки, а я это запомню на будущее. Когда решишь что достаточно, отправь /finish. А если передума - то /cancel')
        return
    }
    const spoiler = spoilers.get(ctx.match)
    if (!spoiler) {
        await ctx.reply('По вашему запросу ничего не найдено')
        return
    }
    try {
        const api = await getAuthorizedAPI(ctx.from!.id)
        if (!api) {
            await ctx.reply('Сначала надо авторизироваться', {
                reply_markup: new InlineKeyboard().url('Войти в Шикимори', getOAuthUrl(ctx.from!.id, ctx.match).toString())
            })
            return
        }
        const me = await api.users.whoami()
        if (!me) {
            return
        }
        const rate = await api.userRates.get({
            user_id: me.id,
            target_id: spoiler.anime_id,
            target_type: 'Anime'
        })
        if (rate.length <= 0 || !rate[0].episodes || rate[0].episodes < spoiler.episode) {
            await ctx.reply('Вы ещё не посмотрели этот эпизод')
            return
        }
        await sendMessages(ctx.chat.id, spoiler.messages)
    } catch (e) { }
})

bot.command('cancel', async ctx => {
    ctx.session.phase = 'start'
    ctx.session.messages = []
    ctx.session.anime_id = 0
    await ctx.reply('Ну передумали так передумали чо бубнить то')
})

bot.on('inline_query', async ctx => {
    if (ctx.inlineQuery.query != '') {
        const spoiler = spoilers.get(ctx.inlineQuery.query)
        if (spoiler) {
            await ctx.answerInlineQuery([{
                type: 'article',
                id: ctx.inlineQuery.query,
                title: 'Отправить спойлер',
                input_message_content: {
                    message_text: `Спойлеры к ${spoiler.episode} серии [${spoiler.anime_id}](https://shikimori.me/animes/${spoiler.anime_id})`,
                    parse_mode: 'MarkdownV2'
                },
                reply_markup: new InlineKeyboard().url('Открыть', `https://t.me/${config.telegram.username}?start=${ctx.inlineQuery.query}`)
            }])
            return
        }
    }
    await ctx.answerInlineQuery([], {
        button: {
            text: 'Создать спойлер',
            start_parameter: 'create'
        }
    })
})

const contentPhase = bot.filter(ctx => ctx.session.phase == 'content')

contentPhase.command('finish', async ctx => {
    ctx.session.phase = 'title'
    await ctx.reply('Отлично! Теперь отправь мне ссылку на тайтл на Шикимори (можешь воспользовать @radionoisebot)')
})

contentPhase.on('msg', async ctx => {
    let media: InputMedia<never> | null = null
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
    const spoiler_id = spoilers.create({
        ...ctx.session,
        episode
    })
    await spoilers.save('./data/spoilers.json')
    await ctx.reply('Спойлер создан!', {
        reply_markup: new InlineKeyboard().switchInline('Отправить спойлер', spoiler_id)
    })
})

const app = express()
app.use(treeDiagram)
app.use(express.static(path.resolve('static')))

app.listen(9087)
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
