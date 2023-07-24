import axios from "axios"
import FormData from 'form-data'
import { Router } from "express"
import { Composer } from "grammy"
import { config } from "./config"
import { RawTokenResponse } from "./models/token-response"
import { RawTokens } from "./models/tokens"
import { readFileSync } from "fs"
import { writeFile } from "fs/promises"
import { API } from "shikimori"

export const aleister = new Composer
export const treeDiagram = Router()

let tokens = RawTokens.parse(JSON.parse(readFileSync('data/tokens.json', { encoding: 'utf-8' })))

treeDiagram.get('/oauth', async (req, res) => {
    if (!req.query.code || typeof req.query.code != 'string') {
        return res.redirect('/')
    }
    if (!req.query.id || typeof req.query.id != 'string') {
        return res.redirect('/wrong.html')
    }

    const { id, spoiler_id, code } = req.query
    console.log('Get code %s %s', id, code)
    const form = new FormData()
    form.append('grant_type', 'authorization_code')
    form.append('client_id', config.shiki.client_id)
    form.append('client_secret', config.shiki.client_secret)
    form.append('code', code)
    form.append('redirect_uri', getRedirectUri(parseInt(id), spoiler_id?.toString()))

    console.log('Start fetching token')
    const response = await axios.post(
        'https://shikimori.me/oauth/token',
        form,
        {
            headers: {
                ...form.getHeaders(),
                'User-Agent': config.shiki.name
            },
            validateStatus: _status => true
        }
    )

    if (response.status != 200) {
        console.log(response.data)
        return res.redirect('/wrong.html')
    }

    console.log('Parsing token')
    const parsed = RawTokenResponse.safeParse(response.data)
    if (!parsed.success) {
        return res.redirect('/wrong.html')
    }

    tokens[id] = {
        access_token: parsed.data.access_token,
        refresh_token: parsed.data.refresh_token,
        valid_until: parsed.data.created_at + parsed.data.expires_in
    }
    console.log('Saving tokens')
    await writeFile('data/tokens.json', JSON.stringify(tokens))
    return res.redirect('/success.html')
})

const defaultOptions = {
    userAgent: config.shiki.name,
    axios: {
        headers: { "Accept-Encoding": "*" }
    }
}

export const shikimori = getUnauthorizedAPI()

export function getUnauthorizedAPI() {
    return new API(defaultOptions)
}

export async function getAuthorizedAPI(id: number) {
    console.log('Getting api for ' + id)
    let token = tokens[id]
    if (!token) {
        return null
    }
    const now = Date.now() / 1000
    if (token.valid_until < now) {
        console.log('Refreshing token')
        const form = new FormData()
        form.append('grant_type', 'refresh_token')
        form.append('client_id', config.shiki.client_id)
        form.append('client_secret', config.shiki.client_secret)
        form.append('refresh_token', token.refresh_token)

        const response = await axios.post(
            'https://shikimori.me/oauth/token',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': config.shiki.name
                },
                validateStatus: _status => true
            }
        )

        if (response.status != 200) {
            console.log(response.data)
            return null
        }

        console.log('Parsing token')
        const parsed = RawTokenResponse.safeParse(response.data)
        if (!parsed.success) {
            console.log(parsed)
            return null
        }

        token = tokens[id] = {
            access_token: parsed.data.access_token,
            refresh_token: parsed.data.refresh_token,
            valid_until: parsed.data.created_at + parsed.data.expires_in
        }
        await writeFile('data/tokens.json', JSON.stringify(tokens))
    }

    return new API({
        token: token.access_token,
        ...defaultOptions
    })
}

export function loggedIn(id: number) {
    console.log('Logged in? ' + id + ' ' + (id in tokens))
    return id in tokens
}

export function getRedirectUri(id: number, spoiler_id: string) {
    const redirect_uri = new URL('https://animespoilero.darkhole.space/oauth')
    redirect_uri.searchParams.append('id', id.toString())
    redirect_uri.searchParams.append('spoiler_id', spoiler_id)
    return redirect_uri
}

export function getOAuthUrl(id: number, spoiler_id: string) {
    const url = new URL('https://shikimori.me/oauth/authorize')
    url.searchParams.append('client_id', config.shiki.client_id)
    url.searchParams.append('redirect_uri', getRedirectUri(id, spoiler_id).toString())
    url.searchParams.append('response_type', 'code')
    url.searchParams.append('scope', '')
    return url
}