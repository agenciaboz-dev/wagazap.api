import { Prisma } from "@prisma/client"
import WAWebJS, { Client, Contact, LocalAuth, Message, MessageMedia } from "whatsapp-web.js"
import { prisma } from "../../prisma"
import { FileUpload, WithoutFunctions } from "../helpers"
import { uid } from "uid"
import { getIoInstance } from "../../io/socket"
import { Socket } from "socket.io"
import axios from "axios"
import { saveFile } from "../../tools/saveFile"
import { convertFile } from "../../tools/convertMedia"
import { WashimaMessage } from "./WashimaMessage"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { WashimaGroupUpdate, WashimaGroupUpdateForm } from "./WashimaGroupUpdate"
import { getDirectorySize } from "../../tools/getDirectorySize"
import { deleteDirectory } from "../../tools/deleteDirectory"
import Fuse from "fuse.js"
import numeral from "numeral"
import { Company } from "../Company"
import { Bot } from "../Bot/Bot"
import { sleep } from "../../tools/sleep"
import { Board } from "../Board/Board"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import path from "path"
import { normalizeContactId } from "../../tools/normalize"
// import numeral from 'numeral'

// export const washima_include = Prisma.validator<Prisma.WashimaInclude>()({  })
export type WashimaPrisma = Prisma.WashimaGetPayload<{}>
export type WashimaMediaPrisma = Prisma.WashimaMediaGetPayload<{}>
export type WashimaProfilePicPrisma = Prisma.WashimaProfilePicGetPayload<{}>
export type WashimaStatus = "loading" | "ready" | "qrcode" | "error" | "stopped"
export interface WashimaDiskMetrics {
    messages: number
    media: number
}

export interface WashimaForm {
    company_id: string
}

export interface WashimaMessageId {
    fromMe: boolean
    id: string
    remote: string
    _serialized: string
}

interface WashimaMediaFormHelper extends FileUpload {
    mimetype: string
    base64: string
    size?: number
}

export type WashimaMediaForm = Omit<WashimaMediaFormHelper, "name"> & { name?: string; convertToFormat?: string }

export class WashimaProfilePic {
    chat_id: string
    last_updated: string
    url: string

    constructor(data: WashimaProfilePicPrisma) {
        this.chat_id = data.chat_id
        this.last_updated = data.last_updated
        this.url = data.url
    }
}

export class WashimaMedia {
    message_id: string
    filename: string
    data: string
    mimetype: string
    size: string

    static async new(data: WashimaMediaPrisma) {
        try {
            const media_prisma = await prisma.washimaMedia.create({
                data: {
                    data: data.data,
                    filename: data.filename,
                    message_id: data.message_id,
                    mimetype: data.mimetype,
                    washima_id: data.washima_id,
                    size: data.size,
                },
            })
            return new WashimaMedia(media_prisma)
        } catch (error) {
            console.log(error)
        }
    }

    static async get(message_id: string) {
        const data = await prisma.washimaMedia.findUnique({ where: { message_id } })
        if (!data) return

        return new WashimaMedia(data)
    }

    static async getMetadata(message_id: string) {
        const data = await prisma.washimaMedia.findUnique({
            where: { message_id },
            select: { filename: true, mimetype: true, size: true, message_id: true, washima_id: true },
        })
        if (!data) return

        return new WashimaMedia({ ...data, data: "" })
    }

    constructor(data: WashimaMediaPrisma) {
        this.message_id = data.message_id
        this.filename = data.filename
        this.mimetype = data.mimetype
        this.data = data.data
        this.size = data.size
    }
}

export class Washima {
    id: string
    name: string
    number: string
    created_at: string
    active: boolean
    ready: boolean

    client: Client
    qrcode?: string
    info: WAWebJS.ClientInfo
    chats: WAWebJS.Chat[]
    contact: string
    diskMetrics?: WashimaDiskMetrics

    companies: Company[] = []
    syncing = false
    status: WashimaStatus = "loading"

    static initializeBatch = 4
    static washimas: Washima[] = []
    static waitingList: Washima[] = []
    static initializing = new Map<string, Washima>()

    static messagesQueue = new Map<string, { washima: Washima; messages: { message: Message; ack?: boolean }[] }>()
    static listInterval = setInterval(() => {
        if (Washima.initializing.size < Washima.initializeBatch) {
            const next_washima = Washima.waitingList.pop()
            if (next_washima) {
                Washima.initializing.set(next_washima.id, next_washima)
                next_washima.initialize()
            }
        }

        if (Washima.messagesQueue.size > 0) {
            for (const [key, value] of Washima.messagesQueue.entries()) {
                const { washima, messages } = value
                if (messages.length === 0) return
                let message = messages[0]
                let index = 0

                for (const [current_index, current_message] of messages.entries()) {
                    if (current_message.message.timestamp < message.message.timestamp) {
                        message = current_message
                        index = current_index
                    }
                }

                messages.splice(index, 1)

                if (message) {
                    if (message.ack) {
                        washima.handleAck(message.message)
                    } else {
                        washima.handleNewMessage(message.message)
                    }
                }

                if (messages.length === 0) {
                    Washima.messagesQueue.delete(key)
                }
            }
        }
    }, 1000 * 1)

    static find(id: string) {
        const washima = Washima.washimas.find((item) => item.id === id)
        return washima
    }

    static async query(id: string) {
        const data = await prisma.washima.findUnique({ where: { id } })
        if (!data) throw "washima não encontrado"
        const washima = new Washima(data)
        return washima
    }

    static async list() {
        const data = await prisma.washima.findMany({ orderBy: { created_at: "desc" } })
        const list = data.map((item) => new Washima(item))
        return list
    }

    static async initialize() {
        console.log("initializing washimas")
        const washimas = await Washima.list()
        console.log(`${washimas.length} whatsapp numbers`)

        Washima.waitingList = washimas
    }

    static push(washima: Washima) {
        Washima.washimas = Washima.washimas.filter((item) => item.id !== washima.id)
        Washima.washimas.push(washima)
    }

    static async new(data: WashimaForm) {
        const washima_prisma = await prisma.washima.create({
            data: {
                id: uid(),
                created_at: new Date().getTime().toString(),
                name: "",
                number: "",
                companies: { connect: { id: data.company_id } },
            },
        })

        const washima = new Washima(washima_prisma)

        Washima.push(washima)
        return washima
    }

    static async delete(washima_id: string) {
        const deleted = await prisma.washima.delete({ where: { id: washima_id } })
        const washima = Washima.find(deleted.id)
        if (washima) {
            try {
                const chats = await washima.client.getChats()
                for (const chat of chats) {
                    if (chat.isGroup) {
                        continue
                    }

                    await prisma.washimaMessage.deleteMany({ where: { washima_id, chat_id: chat.id._serialized } })
                }
            } catch (error) {
                console.log(error)
            }

            await washima.client.destroy()
            Washima.washimas = Washima.washimas.filter((item) => item.id !== washima_id)
            await deleteDirectory(`static/washima/auth/whatsapp.auth.${washima.id}`)
            await deleteDirectory(`static/washima/${washima.id}`)
            Board.handleWashimaDelete({ washima_id, company_id: washima.companies[0].id })
            return washima
        }
    }

    static async forwardMessage(socket: Socket, washima_id: string, chat_id: string, destinatary_ids: string[], message_ids: string[]) {
        const washima = Washima.find(washima_id)
        if (washima) {
            const messages = (await Promise.all(message_ids.map(async (message_id) => await washima.client.getMessageById(message_id)))).sort(
                (a, b) => a.timestamp - b.timestamp
            )

            destinatary_ids.forEach(async (destinatary_id) => {
                for (const message of messages) {
                    await message.forward(destinatary_id)
                    await sleep(1000)
                }
            })
        }
    }

    static async sendMessage(
        socket: Socket,
        washima_id: string,
        chat_id: string,
        message?: string,
        media?: WashimaMediaForm,
        replyMessage?: WashimaMessage
    ) {
        try {
            const washima = Washima.find(washima_id)
            if (washima && chat_id) {
                if (media?.convertToFormat) {
                    const convertedBase64 = (await convertFile({
                        file: media.file as ArrayBuffer,
                        output_format: media.convertToFormat,
                        returnBase64: true,
                        // customArgs: ["-acodec", "opus", "-ac", "1", "-f", "ogg", "-avoid_negative_ts", "make_zero"],
                    })) as string

                    media.base64 = convertedBase64
                }
                await washima.sendMessage(chat_id, message, media, replyMessage)
                socket.emit("washima:message:sent")
            }
        } catch (error) {
            console.log(error)
        }
    }

    static async getContact(socket: Socket, washima_id: string, contact_id: string, message_id: string) {
        const washima = Washima.find(washima_id)
        if (washima) {
            try {
                const name = await washima.getContact(normalizeContactId(contact_id))
                socket.emit("washima:message:contact", message_id, name)
            } catch (error) {
                console.log("error getting contact")
                console.log(error)
            }
        }
    }

    constructor(data: WashimaPrisma) {
        this.id = data.id
        this.name = data.name
        this.number = data.number
        this.created_at = data.created_at
        this.active = data.active
        this.ready = false

        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: `static/washima/auth/whatsapp.auth.${this.id}` }),
            puppeteer: {
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-features=VizDisplayCompositor",
                    // "--single-process",
                    "--no-zygote",
                    "--renderer-process-limit=1",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-client-side-phishing-detection",
                    "--disable-component-update",
                    "--disable-default-apps",
                    "--disable-domain-reliability",
                    "--disable-extensions",
                    "--disable-hang-monitor",
                    "--disable-ipc-flooding-protection",
                    "--disable-notifications",
                    "--disable-offer-store-unmasked-wallet-cards",
                    "--disable-popup-blocking",
                    "--disable-prompt-on-repost",
                    "--disable-renderer-backgrounding",
                    "--disable-sync",
                    "--force-color-profile=srgb",
                    "--metrics-recording-only",
                    "--mute-audio",
                    "--no-crash-upload",
                    "--no-pings",
                    "--password-store=basic",
                    "--use-gl=swiftshader",
                    "--use-mock-keychain",
                    "--disable-software-rasterizer",
                ],
                executablePath: "/usr/bin/google-chrome-stable",
            },
        })
        this.info = this.client.info
        this.chats = []
        this.contact = ""
    }

    async handleAck(message: Message) {
        const io = getIoInstance()
        const chat = await message.getChat()
        try {
            const updated = await WashimaMessage.update(message)
            io.emit("washima:message:update", updated, chat.id._serialized)
            io.emit(`washima:${this.id}:message`, { chat, message: updated })
        } catch (error) {
            // console.log(error)
        }
        const index = this.chats.findIndex((item) => item.id._serialized === chat.id._serialized)
        this.chats[index] = { ...chat, lastMessage: message, unreadCount: message.fromMe ? 0 : (this.chats[index]?.unreadCount || 0) + 1 }
        this.emit()
    }

    async handleNewMessage(message: Message) {
        const handler = async (message: WAWebJS.Message) => {
            if (message.id.remote === "status@broadcast") return
            if (await WashimaMessage.findBySid(message.id._serialized)) return
            const contact = await message.getContact()
            const chat = await message.getChat()

            // console.log(JSON.stringify(message))

            const io = getIoInstance()

            if (message.hasMedia) {
                await this.getCachedMedia(message)
            }

            const index = this.chats.findIndex((item) => item.id._serialized === chat.id._serialized)

            this.chats[index] = { ...chat, lastMessage: message, unreadCount: message.fromMe ? 0 : (this.chats[index]?.unreadCount || 0) + 1 }

            this.companies.forEach(async (company) => {
                const users = await company.getUsers()
                users.forEach((user) =>
                    user.notify("washima-message", {
                        title: `${this.name}: ${chat.name}. ${chat.isGroup ? message.author : ""}`,
                        body: message.body || "MEDIA",
                    })
                )
            })
            this.emit()
            if (chat.isGroup && (await WashimaMessage.getByWrongId(message.id.id))) {
                console.log("message already saved")
                return // stopping message from being saved if it was sent by another washima
            }

            const washima_message = await WashimaMessage.new(
                {
                    chat_id: chat.id._serialized,
                    washima_id: this.id,
                    message,
                    isGroup: chat.isGroup,
                },
                this.info.pushname,
                contact
            )

            const payload = { chat, message: washima_message }
            io.to(chat.id._serialized).emit("washima:message", payload)
            io.to(this.id).emit("washima:chat", this.chats[index])
            // io.emit("washima:message", { chat, message: washima_message }, this.id)
            // io.emit(`washima:${this.id}:message`, { chat: this.chats[index], message: washima_message })

            if (!message.fromMe && !chat.isGroup) {
                const bots = await Bot.getByWashima(this.id)
                bots.forEach((bot) => {
                    bot.handleIncomingMessage({
                        platform: "washima",
                        platform_id: this.id,
                        message: message.body,
                        chat_id: chat.id._serialized,
                        response: (text, media) => this.sendMessage(chat.id._serialized, text, media as WashimaMediaForm, undefined, true),
                        other_bots: bots.filter((item) => item.id !== bot.id),
                    })
                })
            }

            Board.handleWashimaNewMessage({ chat, company_id: this.companies[0].id, message: washima_message, washima: this })
        }
        try {
            // ignore status updates
            await handler(message)
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.meta?.modelName === "WashimaMessage" && error.meta.target === "PRIMARY") {
                handler(message).catch((err) => console.log(err))
            }
        }
    }

    async initialize() {
        console.log(`initializing ${this.name} - ${this.number}`)
        this.status = "loading"

        try {
            const companies = await Company.getCompaniesFromWashimaId(this.id)
            this.companies = companies
            Washima.push(this)
            const io = getIoInstance()
            this.emit()
            await this.client.initialize()

            //* CLIENT EVENTS

            this.client.on("qr", (qr) => {
                console.log({ qr })
                if (!this.qrcode) {
                    Washima.initializing.delete(this.id)
                } else {
                    this.stop()
                    return
                }

                this.qrcode = qr
                this.status = "qrcode"
                this.emit()
            })

            this.client.on("authenticated", (session) => {
                console.log(JSON.stringify(session))
            })

            this.client.on("ready", async () => {
                console.log(`${this.name} - ${this.number} client is ready, initializing data`)
                this.qrcode = ""
                this.ready = false

                io.emit("washima:ready", this.id)
                this.status = "loading"
                this.emit()

                io.emit(`washima:${this.id}:init`, "Configurando metadados", 1)
                console.log(`washima:${this.id}:init`, "Configurando metadados", 1)
                this.info = this.client.info
                io.emit(`washima:${this.id}:init`, "Buscando chats", 2)
                console.log(`washima:${this.id}:init`, "Buscando chats", 2)
                this.chats = await this.client.getChats()
                this.ready = true
                io.emit(`washima:${this.id}:init`, "Carregando informações do contato", 3)
                console.log(`washima:${this.id}:init`, "Carregando informações do contato", 3)
                this.contact = await this.getContact(this.info.wid._serialized)
                io.emit(`washima:${this.id}:init`, "Pronto", 4)
                console.log(`washima:${this.id}:init`, "Pronto", 4)

                this.status = "ready"

                this.number = this.info.wid.user.slice(2)
                this.name = this.info.pushname
                await this.update({ number: this.number, name: this.name })

                this.emit()

                try {
                    await this.fetchAndSaveAllMessages()
                } catch (error) {
                    console.log(error)
                } finally {
                    Washima.initializing.delete(this.id)
                }
            })

            this.client.on("disconnected", async () => {
                await this.restart()
            })

            this.client.on("message_ack", async (message, ack) => {
                const contact = message.author || message.from

                const current_queue = Washima.messagesQueue.get(contact)
                const messages = current_queue ? current_queue.messages : []
                Washima.messagesQueue.set(contact, { washima: this, messages: [...messages, { message, ack: true }] })
            })

            this.client.on("message_revoke_everyone", async (message, revoked) => {
                const chat = await message.getChat()
                try {
                    const updated = await WashimaMessage.revoke(message)
                    io.emit("washima:message:update", updated, chat.id._serialized)
                    io.emit(`washima:${this.id}:message`, { chat, message: updated })
                } catch (error) {
                    // console.log(error)
                }
                const index = this.chats.findIndex((item) => item.id._serialized === chat.id._serialized)
                this.chats[index] = { ...chat, lastMessage: message, unreadCount: message.fromMe ? 0 : (this.chats[index]?.unreadCount || 0) + 1 }

                this.emit()
            })

            this.client.on("message_edit", async (message, new_body, previous_body) => {
                if (new_body === previous_body) return

                const chat = await message.getChat()
                try {
                    const updated = await WashimaMessage.update(message, { edited: true })
                    io.emit("washima:message:update", updated, chat.id._serialized)
                    io.emit(`washima:${this.id}:message`, { chat, message: updated })
                } catch (error) {
                    // console.log(error)
                }
                const index = this.chats.findIndex((item) => item.id._serialized === chat.id._serialized)
                this.chats[index] = { ...chat, lastMessage: message, unreadCount: message.fromMe ? 0 : (this.chats[index]?.unreadCount || 0) + 1 }

                this.emit()
            })

            this.client.on("message_create", async (message) => {
                if (message.id.remote === "status@broadcast") return
                if (await WashimaMessage.findBySid(message.id._serialized)) return

                const contact = message.author || message.from

                const current_queue = Washima.messagesQueue.get(contact)
                const messages = current_queue ? current_queue.messages : []
                Washima.messagesQueue.set(contact, { washima: this, messages: [...messages, { message }] })
            })

            this.client.on("group_join", async (notification) => {
                try {
                    const chat = await notification.getChat()
                    const chat_index = this.chats.findIndex((item) => item.id._serialized === chat.id._serialized)
                    if (chat_index === -1) {
                        this.chats.push(chat)
                    } else {
                        this.chats[chat_index] = chat
                    }

                    this.emit()

                    this.sendBulkGroupNotification(notification)
                } catch (error) {
                    console.log(error)
                }
            })

            this.client.on("group_update", async (notification) => {
                if (notification.type === "picture") {
                    await this.cacheProfilePic(notification.chatId)
                }
                WashimaGroupUpdate.handleUpdate({ notification, washima_id: this.id })
            })
            this.client.on("group_leave", async (notification) => this.sendBulkGroupNotification(notification))
            this.client.on("group_membership_request", async (notification) => WashimaGroupUpdate.handleUpdate({ notification, washima_id: this.id }))
            this.client.on("group_admin_changed", async (notification) => WashimaGroupUpdate.handleUpdate({ notification, washima_id: this.id }))
        } catch (error) {
            console.log(`failed to initialize ${this.name} - ${this.number} whatsapp`)
            this.status = "error"
            this.emit()
            console.log(error)
        }
    }

    async sendBulkGroupNotification(notification: WAWebJS.GroupNotification) {
        try {
            const body: string[] = []
            for (const [index, recipientId] of notification.recipientIds.entries()) {
                const contact = await this.getContact(recipientId)
                body.push(contact)
            }
            notification.body = JSON.stringify(body)
            const notification_form: WashimaGroupUpdateForm = { notification, washima_id: this.id }
            await WashimaGroupUpdate.handleUpdate(notification_form)
        } catch (error) {
            console.log(error)
        }
    }

    async update(data: Partial<Washima>) {
        const updated = await prisma.washima.update({
            where: { id: this.id },
            data: {
                active: data.active,
                name: data.name,
                number: data.number,
            },
        })

        this.active = updated.active
        this.name = updated.name
        this.number = updated.number

        this.emit()
    }

    async getContactPicture(target_id: string, target?: "chat" | "message") {
        try {
            const profilePic = await this.getCachedProfilePicture(target_id, target)
            return profilePic
        } catch (error) {
            // console.log("error getting contact image")
            // console.log(error)
        }
    }

    async buildChat(id: string, offset?: number) {
        try {
            const chat = await this.client.getChatById(id)
            const messages = await WashimaMessage.getChatMessages(this.id, id, chat.isGroup, offset)
            console.log(messages)

            if (chat.isGroup) {
                const group_updates = await WashimaGroupUpdate.getGroupUpdates(id)
                console.log(group_updates)

                return { messages, group_updates }
            }

            return { messages }
        } catch (error) {
            console.log("error building chat")
            console.log(error)
        }
    }

    async getMessage(message_id: string) {
        const message = await this.client.getMessageById(message_id)
        return message
    }

    async sendMessage(chat_id: string, message?: string, media?: WashimaMediaForm, replyMessage?: WashimaMessage, from_bot?: boolean) {
        const mediaMessage = media ? new MessageMedia(media.mimetype, media.base64, media.name, media.size) : undefined
        if (!message && !mediaMessage) return

        const chat = await this.client.getChatById(chat_id)
        await chat.sendMessage((message || mediaMessage)!, {
            media: mediaMessage,
            sendAudioAsVoice: true,
            quotedMessageId: replyMessage?.sid,
        })

        if (!from_bot) {
            const company = await Company.getById(this.companies[0].id)
            const bots = await company.getBots()
            const activeBot = bots.find((bot) => bot.active_on.find((active_chat) => active_chat.chat_id === chat_id))
            if (activeBot) {
                activeBot.pauseChat(chat_id, 1000 * 60 * 60 * 24) // 1 day
            }
        }
    }

    async getContact(contact_id: string) {
        try {
            const contact = await this.client.getContactById(normalizeContactId(contact_id))
            console.log({ contact })

            return contact.name || (contact.pushname ? `${contact.pushname} - ${contact.number}` : contact.number)
        } catch (error) {
            console.log(error)
            return ""
        }
    }

    async getMedia(message: Message) {
        const media = await this.getCachedMedia(message)

        return media
    }

    async stop() {
        this.status = "loading"
        this.emit()
        try {
            this.status = "stopped"
            await this.client.destroy()
            this.emit()
        } catch (error) {
            console.log(error)
        }
    }

    async restart() {
        try {
            if (this.status !== "stopped") {
                await this.stop()
                console.log("parou")
            }

            this.qrcode = ""
            this.ready = false
            Washima.washimas = Washima.washimas.filter((item) => item.id !== this.id)
            Washima.waitingList.push(this)
            this.status = "loading"
            this.emit()
            console.log("inicializando de novo")
            await this.client.initialize()
        } catch (error) {
            console.log("error initializing")
            console.log(error)
            this.status = "error"
        } finally {
            this.emit()
        }
    }

    async getMediaMeta(message_id: string) {
        const mediaMeta = await WashimaMedia.getMetadata(message_id)
        return mediaMeta
    }

    async cacheProfilePic(target_id: string, target: "chat" | "message" = "chat") {
        let contact: WAWebJS.Contact
        try {
            if (target === "chat") {
                const chat = await this.client.getChatById(target_id)
                contact = await chat.getContact()
            }
            if (target === "message") {
                const message = await this.client.getMessageById(target_id)
                contact = await message.getContact()
            }

            const whatsapp_url = await contact!.getProfilePicUrl()
            const response = await axios.get(whatsapp_url, { responseType: "arraybuffer" })
            const buffer = Buffer.from(response.data, "binary")
            const url =
                saveFile(`/washima/${this.id}/profilePics`, { name: target_id + ".jpg", file: buffer }).url +
                "?time=" +
                new Date().getTime().toString()
            const now = new Date().getTime().toString()

            const cached = await prisma.washimaProfilePic.findUnique({ where: { chat_id: target_id } })
            if (cached) {
                const updated = await prisma.washimaProfilePic.update({
                    where: { chat_id: target_id },
                    data: { url, last_updated: now },
                })
                return new WashimaProfilePic(updated)
            }

            const new_cache = await prisma.washimaProfilePic.create({ data: { chat_id: target_id, last_updated: now, url, washima_id: this.id } })
            return new WashimaProfilePic(new_cache)
        } catch (error) {
            // console.log(error)
        }
    }

    async getCachedMedia(message: Message) {
        const id = message.id._serialized
        const media = await WashimaMedia.get(id)

        if (media) {
            return media
        }

        try {
            const first_time_media = await message.downloadMedia()
            const size = Buffer.byteLength(first_time_media.data, "utf8")
            const formatted_size = numeral(size).format("0.00 b")
            const new_cached = await WashimaMedia.new({
                data: first_time_media.data,
                filename: first_time_media.filename || id + "." + first_time_media.mimetype.split("/")[1].split(";")[0],
                message_id: id,
                mimetype: first_time_media.mimetype,
                washima_id: this.id,
                size: formatted_size,
            })
            return new_cached
        } catch (error) {
            console.log(error)
            console.log(id)
        }
    }

    async getCachedProfilePicture(target_id: string, target?: "chat" | "message") {
        const cached = await prisma.washimaProfilePic.findUnique({ where: { chat_id: target_id } })
        if (cached && Number(cached.last_updated) - 1000 * 60 * 60 * 24 <= new Date().getTime()) {
            return new WashimaProfilePic(cached)
        }

        const new_cache = await this.cacheProfilePic(target_id, target)
        return new_cache
    }

    emit() {
        const io = getIoInstance()
        io.emit("washima:update", this)
    }

    async fetchAndSaveAllMessages(options?: { groupOnly?: boolean }) {
        if (!this.ready || !this.chats.length || this.syncing) return

        this.syncing = true
        const io = getIoInstance()
        this.status = "loading"
        this.emit()

        await sleep(1000)
        console.log(`fetching messages for washima ${this.name}`)

        const chats = options?.groupOnly ? this.chats.filter((chat) => chat.isGroup) : this.chats

        const chatsLog = chats.map((item) => ({
            name: item.name,
            data: {
                started: false,
                messages: false,
                chat: false,
                error_text: "",
            },
        }))

        const existingMessages = await WashimaMessage.getWashimaMessages(this.id)

        for (const [chat_index, chat] of chats.entries()) {
            console.log(`loading messages for chat ${chat.name}. ${chat_index + 1}/${chats.length}`)
            io.emit(`washima:${this.id}:sync:progress`, { chat: chat_index + 1, total_chats: chats.length })
            chatsLog[chat_index].data.started = true

            try {
                const chatMessages = await chat.fetchMessages({ limit: Number.MAX_VALUE })
                const existingChatMessages = chat.isGroup
                    ? await WashimaMessage.getChatMessages(this.id, chat.id._serialized, true, 0, null)
                    : existingMessages

                console.log(existingChatMessages.length)

                const messages = chatMessages.filter(
                    (message) =>
                        message.from !== "0@c.us" &&
                        !existingChatMessages.find((item) => (chat.isGroup ? item.id.id === message.id.id : item.sid === message.id._serialized))
                )

                const contacts = new Map<string, Contact>()

                for (const [index, message] of messages.entries()) {
                    console.log(`fetching message ${index + 1}/${messages.length} from chat ${chat_index + 1}/${chats.length}`)
                    io.emit(`washima:${this.id}:sync:progress`, {
                        message: index + 1,
                        total_messages: messages.length,
                        chat: chat_index + 1,
                        total_chats: chats.length,
                    })

                    try {
                        if (message.author) console.log({ author: message.author })
                        const contact_id = message.author || message.from
                        const contact = contacts.get(contact_id) || (await message.getContact())
                        if (!contacts.has(contact_id)) contacts.set(contact_id, contact)

                        const washima_message = await WashimaMessage.new(
                            {
                                washima_id: this.id,
                                chat_id: chat.id._serialized,
                                message,
                                isGroup: chat.isGroup,
                                createOnly: true,
                            },
                            this.info.pushname,
                            contact
                        )
                        chatsLog[chat_index].data.messages = true
                    } catch (error) {
                        if (error instanceof PrismaClientKnownRequestError && error.meta?.target === "PRIMARY") {
                            try {
                                continue
                                const washima_message = await WashimaMessage.update(message)
                                chatsLog[chat_index].data.messages = true
                            } catch (error) {
                                console.log(error)
                                chatsLog[chat_index].data.error_text = JSON.stringify({ error, message })
                            }
                        } else {
                            console.log(`failed to create/update message ${message.id._serialized}`)
                            console.log("")
                            console.log(error)
                            console.log("")
                            // console.log(message)
                            chatsLog[chat_index].data.error_text = JSON.stringify({ error, message })
                        }
                    }
                }
                chatsLog[chat_index].data.chat = true

                if (!chat.lastMessage && chatMessages.length > 0) {
                    chat.lastMessage = chatMessages[0]
                }
            } catch (error) {
                const text = `failed to fetch messages for chat ${chat.name} due to ${error}`
                console.log(text)
                chatsLog[chat_index].data.error_text = JSON.stringify({ error: text, chat })
            }
        }

        console.log("finished")
        // const directoryPath = "static/synclogs"
        // if (!existsSync(directoryPath)) {
        //     mkdirSync(directoryPath, { recursive: true })
        // }
        // const filePath = path.join(directoryPath, `${this.name}.json`)

        // const formattedLogs = {
        //     chatError: chatsLog.filter((log) => !log.data.chat),
        //     messageError: chatsLog.filter((log) => !log.data.messages),
        //     all: chatsLog,
        // }

        // writeFileSync(filePath, JSON.stringify(formattedLogs))
        this.syncing = false
        this.status = "ready"
        this.emit()
    }

    async getTableUsage(table: string, megabyte?: boolean) {
        interface AvgRowLength {
            AVG_ROW_LENGTH: number
        }
        const [avgRowData] = await prisma.$queryRaw<AvgRowLength[]>`
        SELECT AVG_ROW_LENGTH
        FROM information_schema.TABLES
        WHERE TABLE_NAME = ${table}
    `
        const { AVG_ROW_LENGTH } = avgRowData
        const avgRowLengthInMB = Number(AVG_ROW_LENGTH) / (megabyte ? 1024 * 1024 : 1)

        return avgRowLengthInMB
    }

    async getDiskUsage(megabyte = true) {
        const message_metrics = await this.getTableUsage("WashimaMessage", megabyte)
        const messages_count = await prisma.washimaMessage.count({ where: { washima_id: this.id } })
        const media_metrics = await this.getTableUsage("WashimaMedia", megabyte)
        const media_count = await prisma.washimaMedia.count({ where: { washima_id: this.id } })
        const profile_pic_metrics = (await getDirectorySize(`static/washima/${this.id}/profilePics`)) / (megabyte ? 1024 * 1024 : 1)
        this.diskMetrics = { media: media_metrics * media_count + profile_pic_metrics, messages: message_metrics * messages_count }
        console.log(this.diskMetrics)

        return this.diskMetrics
    }

    async clearMedia() {
        const profilePic = await prisma.washimaProfilePic.deleteMany()
        await deleteDirectory(`static/washima/${this.id}/profilePics`)
        const deletion = await prisma.washimaMedia.deleteMany({ where: { washima_id: this.id } })
        return deletion.count
    }

    async clearMessages() {
        const deletion = await prisma.washimaMessage.deleteMany({ where: { washima_id: this.id } })
        return deletion.count
    }

    async search(value: string, target: "chats" | "messages" = "chats", chat_id?: string) {
        if (target === "chats") {
            const chatsFuse = new Fuse(this.chats, {
                includeScore: true,
                keys: ["name"],
                threshold: 0.2, // Lower threshold for closer matches
                ignoreLocation: true, // Ignores the location of the match which allows for more general matching
                minMatchCharLength: 2, // Minimum character length of matches to consider
            })
            const chatsResults = chatsFuse.search(value).map((result) => result.item)
            chatsResults.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp)

            return chatsResults
        }

        if (target === "messages") {
            const allMessagesResults = await WashimaMessage.search(value, chat_id)
            const messagesResults = allMessagesResults
                .filter((message) => this.chats.find((chat) => chat.id._serialized === message.chat_id))
                .filter((message) => message.to === this.info.wid._serialized || message.from === this.info.wid._serialized)

            return messagesResults
        }

        return []
    }

    toJSON() {
        return { ...this, client: null }
    }
}
