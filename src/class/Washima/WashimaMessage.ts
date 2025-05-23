import { Prisma } from "@prisma/client"
import { prisma } from "../../prisma"
import WAWebJS, { Contact } from "whatsapp-web.js"
import { WashimaMessageId } from "./Washima"
import Fuse from "fuse.js"
import { normalizeContactId } from "../../tools/normalize"

export type MessageType =
    | "ptt"
    | "video"
    | "image"
    | "text"
    | "revoked"
    | "sticker"
    | "audio"
    | "chat"
    | "document"
    | "sticker"
    | "call_log"
    | "e2e_notification"
    | "notification_template"

export enum MessageAck {
    error = -1,
    pending = 0,
    sent = 1,
    received = 2,
    read = 3,
    played = 4,
}

export type WashimaMessagePrisma = Prisma.WashimaMessageGetPayload<{}>

export interface WashimaMessageForm {
    message: WAWebJS.Message
    washima_id: string
    chat_id: string
    isGroup?: boolean
    createOnly?: boolean
    from_bot?: string
}

export interface WashimaCall {
    isVideoCall: boolean
    callDuration: number | null
    callParticipants: any
}

export class WashimaMessage {
    sid: string
    washima_id: string
    chat_id: string

    id: WashimaMessageId
    author?: string | null
    body: string
    from: string
    fromMe: boolean
    hasMedia: boolean
    timestamp: number
    to: string
    type: MessageType
    ack?: MessageAck | null
    edited: boolean
    deleted: boolean
    replied_to?: WashimaMessage | null
    forwarded: boolean
    phone_only: boolean | null
    call: WashimaCall | null
    contact_id: string | null
    from_bot: string | null

    static async getChatMessages(washima_id: string, chat_id: string, is_group: boolean, offset: number = 0, take?: number | null) {
        const data = await prisma.washimaMessage.findMany({
            where: { chat_id, washima_id: is_group ? undefined : washima_id },
            orderBy: { timestamp: "desc" },
            skip: offset,
            take: take === null ? undefined : take || 10,
        })
        return data.map((item) => new WashimaMessage(item))
    }

    static async getWashimaMessages(washima_id: string, body?: any) {
        const data = await prisma.washimaMessage.findMany({ where: { washima_id, body }, orderBy: { timestamp: "desc" } })
        return data.map((item) => new WashimaMessage(item))
    }

    static async search(value: string, chat_id?: string) {
        const data = await prisma.washimaMessage.findMany({ orderBy: { timestamp: "desc" }, where: { chat_id } })
        const all_messages = data.map((item) => new WashimaMessage(item))
        const messagesFuse = new Fuse(all_messages, {
            includeScore: true,
            keys: ["body"],
            threshold: 0.2, // Lower threshold for closer matches
            ignoreLocation: true, // Ignores the location of the match which allows for more general matching
            minMatchCharLength: 2, // Minimum character length of matches to consider
        })

        const messages_result = messagesFuse.search(value).map((item) => item.item)

        return messages_result
    }

    static async findBySid(sid: string) {
        const result = await prisma.washimaMessage.findUnique({ where: { sid } })

        return result ? new WashimaMessage(result) : null
    }

    static async getBySid(sid: string) {
        const result = await prisma.washimaMessage.findUnique({ where: { sid } })
        if (!result) throw "messagem não encontrada"

        return new WashimaMessage(result)
    }

    static async getByWrongId(id: string) {
        const result = await prisma.washimaMessage.findFirst({ where: { id: { contains: id } } })
        if (result) return new WashimaMessage(result)

        return null
    }

    static async new(data: WashimaMessageForm, author?: string, _contact?: Contact) {
        const message = data.message
        let contact = _contact || (await message.getContact())

        let existing_message: WashimaMessage | undefined
        try {
            existing_message = (await WashimaMessage.getByWrongId(message.id.id)) || (await WashimaMessage.getBySid(message.id._serialized))
        } catch (error) {}
        if (data.isGroup && existing_message && !data.createOnly) {
            return existing_message
        }

        if (data.isGroup && !message.fromMe) {
            message.author = contact.name || `${contact.pushname} - ${contact.number}`
        }

        let washimaQuotedMessage: WashimaMessage | undefined = undefined
        if (message.hasQuotedMsg) {
            const quotedMessage = await message.getQuotedMessage()
            washimaQuotedMessage = await WashimaMessage.getBySid(quotedMessage.id._serialized)
        }

        let washimaCall: WashimaCall | undefined = undefined
        // if (message.type === "call_log") {
        //     washimaCall = {
        //         callDuration: message._data.callDuration,
        //         callParticipants: message._data.callParticipants,
        //         isVideoCall: message._data.isVideoCall,
        //     }
        // }

        const saved = await prisma.washimaMessage.create({
            data: {
                washima_id: data.washima_id,
                chat_id: data.chat_id,
                sid: message.id._serialized,
                id: JSON.stringify(message.id),
                timestamp: JSON.stringify(message.timestamp),
                body: message.body || "",
                from: message.from || "",
                fromMe: message.fromMe || false,
                hasMedia: message.hasMedia || false,
                to: message.to || "",
                type: message.type || "",
                ack: message.ack || 0,
                author: message.author || author || "",
                replied_to: JSON.stringify(washimaQuotedMessage) || undefined,
                forwarded: message.isForwarded,
                phone_only: (message as any)._data?.subtype === "phone_only_feature",
                call:
                    message.type === "call_log"
                        ? JSON.stringify({
                              callDuration: null,
                              callParticipants: null,
                              isVideoCall: false,
                          })
                        : undefined,
                contact_id: normalizeContactId(contact.id._serialized),
                from_bot: data.from_bot,
            },
        })

        console.log(new WashimaMessage(saved))
        return new WashimaMessage(saved)
    }

    static async update(message: WAWebJS.Message, options?: { edited?: boolean; deleted?: boolean }) {
        try {
            const data = await prisma.washimaMessage.update({
                where: { sid: message.id._serialized },
                data: {
                    ack: message.ack,
                    body: message.body,
                    timestamp: JSON.stringify(message.timestamp),
                    type: message.type,
                    author: message.author,
                    edited: options?.edited,
                    deleted: options?.deleted,
                },
            })

            return new WashimaMessage(data)
        } catch (error) {
            console.log(error)
        }
    }

    static async revoke(message: WAWebJS.Message) {
        try {
            const current_message = await prisma.washimaMessage.findFirst({
                where: { timestamp: message.timestamp.toString(), from: message.from, to: message.to },
            })
            if (current_message) {
                const data = await prisma.washimaMessage.update({
                    where: { sid: current_message.sid },
                    data: {
                        deleted: true,
                    },
                })

                return new WashimaMessage(data)
            } else {
                throw "message not found"
            }
        } catch (error) {
            console.log(error)
        }
    }

    constructor(data: WashimaMessagePrisma) {
        this.sid = data.sid
        this.washima_id = data.washima_id
        this.chat_id = data.chat_id

        this.id = JSON.parse(data.id)
        this.author = data.author
        this.body = data.body
        this.from = data.from
        this.fromMe = data.fromMe
        this.hasMedia = data.hasMedia
        this.timestamp = Number(data.timestamp)
        this.to = data.to
        this.type = data.type as MessageType
        this.ack = data.ack
        this.edited = data.edited
        this.deleted = data.deleted
        this.replied_to = data.replied_to ? (JSON.parse(data.replied_to as string) as WashimaMessage) : null
        this.forwarded = data.forwarded
        this.phone_only = data.phone_only
        this.call = data.call ? (JSON.parse(data.call as string) as WashimaCall) : null
        this.contact_id = data.contact_id
        this.from_bot = data.from_bot
    }
}
