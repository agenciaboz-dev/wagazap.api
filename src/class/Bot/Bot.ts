import { Prisma } from "@prisma/client"
import { FileUpload, WithoutFunctions } from "../helpers"
import { prisma } from "../../prisma"
import { now } from "lodash"
import { WashimaMediaForm } from "../Washima/Washima"
import { Edge, Node, ReactFlowJsonObject } from "@xyflow/react"
import Fuse from "fuse.js"
import { convertFile } from "../../tools/convertMedia"
import { saveFile } from "../../tools/saveFile"
import { NagazapMediaForm, WhatsappInteractiveForm } from "../Nagazap"
import { file2base64 } from "../../tools/file2base64"
import { sleep } from "../../tools/sleep"
import { NodeAction } from "./NodeAction"
import { getIoInstance } from "../../io/socket"

export const bot_include = Prisma.validator<Prisma.BotInclude>()({ washimas: { select: { id: true } }, nagazaps: { select: { id: true } } })
type BotPrisma = Prisma.BotGetPayload<{ include: typeof bot_include }>

export interface FlowNodeData {
    [key: string]: any
    onAddChild: (type: "message" | "response") => void
    addLoop: (options: { from: string; to: string }) => void
    value: string
    editNode: (node: FlowNode | null) => void
    fitNodeView: (node: FlowNode | string) => void
    deleteNode?: (node: FlowNode) => void
    getChildren: (parentId: string, type?: "direct" | "recursive") => FlowNode[]
    media?: {
        url: string
        mimetype: string
        type: "audio" | "image" | "video" | "document"
        name: string
        base64?: string
    }
    actions?: NodeAction[]
    next_node_id?: string
    interactive?: WhatsappInteractiveForm
}
export interface FlowNode extends Node {
    data: FlowNodeData
}

export interface FlowEdge extends Edge {
    type?: string
    animated?: boolean
}

export class ActiveBot {
    chat_id: string
    current_node_id: string
    last_interaction: number
    started_at: number

    constructor(data: WithoutFunctions<ActiveBot>) {
        this.chat_id = data.chat_id
        this.current_node_id = data.current_node_id
        this.last_interaction = data.last_interaction
        this.started_at = data.started_at
    }
}

export type BotForm = Omit<WithoutFunctions<Bot>, "id" | "created_at" | "triggered" | "instance" | "active_on">

export interface PendingResponse {
    response: (text: string) => Promise<void>
    expiry?: number
    idleness?: number
    chat_id: string
    bot: Bot
    platform: "washima" | "nagazap"
    platform_id: string
}

export interface PausedInteraction {
    expiry: number | null
    chat_id: string
}

export interface BotMessageForm {
    message: string
    chat_id: string
    response: (text: string, media?: WashimaMediaForm | NagazapMediaForm, interactive?: WhatsappInteractiveForm) => Promise<void>
    other_bots: Bot[]
    platform: "nagazap" | "washima"
    platform_id: string
}

export class Bot {
    id: string
    name: string
    created_at: string
    trigger: string
    triggered: number
    instance: ReactFlowJsonObject<FlowNode, FlowEdge>
    active_on: ActiveBot[]
    company_id: string
    nagazap_ids: string[]
    washima_ids: string[]
    fuzzy_threshold: number
    expiry_minutes: number
    expiry_message: string
    idleness_minutes: number
    idleness_message: string
    paused_chats = new Map<string, PausedInteraction>()

    static pending_response = new Map<string, PendingResponse>()
    static expiry_interval = setInterval(() => Bot.checkForExpiredChats(), 1000 * 10)

    static async new(data: BotForm) {
        const result = await prisma.bot.create({
            data: {
                active_on: JSON.stringify([]),
                created_at: now().toString(),
                instance: JSON.stringify(null),
                name: data.name,
                trigger: data.trigger,
                triggered: 0,
                company_id: data.company_id,
                nagazaps: { connect: data.nagazap_ids.map((id) => ({ id })) },
                washimas: { connect: data.washima_ids.map((id) => ({ id })) },
                expiry_minutes: data.expiry_minutes,
                fuzzy_threshold: data.fuzzy_threshold,
                expiry_message: data.expiry_message,
                idleness_minutes: data.idleness_minutes,
                idleness_message: data.idleness_message,
            },
            include: bot_include,
        })

        return new Bot(result)
    }

    static async getById(id: string) {
        const result = await prisma.bot.findUnique({ where: { id }, include: bot_include })
        if (!result) throw "Bot não encontrado"

        return new Bot(result)
    }

    static async getByWashima(washima_id: string) {
        const result = await prisma.bot.findMany({ where: { washimas: { some: { id: washima_id } } }, include: bot_include })
        return result.map((item) => new Bot(item))
    }

    static async getByNagazap(nagazap_id: string) {
        const result = await prisma.bot.findMany({ where: { nagazaps: { some: { id: nagazap_id } } }, include: bot_include })
        return result.map((item) => new Bot(item))
    }

    static async checkForExpiredChats() {
        for (const map of Bot.pending_response) {
            const [key, item] = map
            const bot = await Bot.getById(item.bot.id)

            if (!bot.washima_ids.includes(item.platform_id) && !bot.nagazap_ids.includes(item.platform_id)) {
                bot.closeChat(key)
                continue
            }

            if (item.expiry && now() >= item.expiry) {
                if (!bot.isPaused(item.chat_id)) {
                    item.response(bot.expiry_message)
                }
                bot.closeChat(key)
            }

            if (item.idleness && now() >= item.idleness) {
                if (!bot.isPaused(item.chat_id)) {
                    item.response(bot.idleness_message)
                }
                item.idleness = undefined
            }
        }
    }

    constructor(data: BotPrisma) {
        this.id = data.id
        this.name = data.name
        this.created_at = data.created_at
        this.trigger = data.trigger
        this.triggered = data.triggered
        this.instance = JSON.parse(data.instance as string)
        this.active_on = JSON.parse(data.active_on as string).map((item: ActiveBot) => new ActiveBot(item))
        this.company_id = data.company_id
        this.washima_ids = data.washimas.map((item) => item.id)
        this.nagazap_ids = data.nagazaps.map((item) => item.id)
        this.expiry_minutes = data.expiry_minutes
        this.fuzzy_threshold = data.fuzzy_threshold
        this.expiry_message = data.expiry_message
        this.idleness_minutes = data.idleness_minutes
        this.idleness_message = data.idleness_message

        if (data.paused_on) {
            const list = JSON.parse(data.paused_on as string) as PausedInteraction[]
            for (const item of list) {
                this.paused_chats.set(item.chat_id, { chat_id: item.chat_id, expiry: item.expiry })
            }
        }

        // console.log(this)
    }

    load(data: BotPrisma) {
        this.id = data.id
        this.name = data.name
        this.created_at = data.created_at
        this.trigger = data.trigger
        this.triggered = data.triggered
        this.instance = JSON.parse(data.instance as string)
        this.active_on = JSON.parse(data.active_on as string)
        this.company_id = data.company_id
        this.washima_ids = data.washimas.map((item) => item.id)
        this.nagazap_ids = data.nagazaps.map((item) => item.id)
        this.expiry_minutes = data.expiry_minutes
        this.fuzzy_threshold = data.fuzzy_threshold
        this.expiry_message = data.expiry_message
        this.idleness_minutes = data.idleness_minutes
        this.idleness_message = data.idleness_message
    }

    async update(data: Partial<Bot>) {
        if (data.instance) {
            for (const node of data.instance?.nodes) {
                const media = node.data.media
                if (media) {
                    const base64 = media.base64
                    if (base64) {
                        const file = saveFile(`company-${this.company_id}/bot-${this.name}/media`, {
                            name: media.name,
                            base64,
                            mimetype: media.mimetype,
                        })
                        console.log(file)

                        media.base64 = undefined
                        media.url = file.url
                    }
                }
            }
        }

        console.log(data.instance?.nodes)

        const result = await prisma.bot.update({
            where: { id: this.id },
            data: {
                name: data.name,
                trigger: data.trigger,
                nagazaps: data.nagazap_ids ? { set: [], connect: data.nagazap_ids.map((id) => ({ id })) } : undefined,
                washimas: data.washima_ids ? { set: [], connect: data.washima_ids.map((id) => ({ id })) } : undefined,
                instance: JSON.stringify(data.instance),
                fuzzy_threshold: data.fuzzy_threshold,
                expiry_minutes: data.expiry_minutes,
                expiry_message: data.expiry_message,
                idleness_minutes: data.idleness_minutes,
                idleness_message: data.idleness_message,
            },
            include: bot_include,
        })

        this.load(result)
    }

    async getChannels() {
        // const washimas = Washima.washimas.filter()
    }

    async delete() {
        await prisma.bot.delete({ where: { id: this.id } })
    }

    pauseChat(chat_id: string, minutes?: number) {
        const paused_interaction: PausedInteraction = { chat_id, expiry: minutes ? new Date().getTime() + 1000 * 60 * minutes : null }
        this.paused_chats.set(chat_id, paused_interaction)
        this.save()
        this.closeChat(chat_id, true)
        const io = getIoInstance()
        io.emit(`bot:paused:${chat_id}`, this)
    }

    unpauseChat(chat_id: string) {
        this.paused_chats.delete(chat_id)
        const io = getIoInstance()
        io.emit(`bot:paused:${chat_id}`, null)
        this.save()
    }

    isPaused(chat_id: string) {
        const paused_interaction = this.paused_chats.get(chat_id)

        if (paused_interaction) {
            if (paused_interaction.expiry && paused_interaction.expiry < new Date().getTime()) {
                this.unpauseChat(chat_id)
                return false
            }

            return true
        }

        return false
    }

    async handleIncomingMessage(data: BotMessageForm) {
        if (data.other_bots.some((bot) => bot.getActiveChat(data.chat_id))) return
        if (this.isPaused(data.chat_id)) return

        let current_chat = this.getActiveChat(data.chat_id)

        if (!current_chat && this.compareIncomingMessage(data.message) !== undefined) {
            current_chat = this.newChat(data.chat_id)
        }

        if (current_chat) {
            if (this.compareIncomingMessage(data.message, "reset") !== undefined) {
                this.closeChat(current_chat.chat_id)
                await data.response("bot reiniciado")
                return
            }

            const io = getIoInstance()
            io.emit(`bot:activity:${current_chat.chat_id}`, this)
            const bot_responses = this.advanceChat(current_chat, data.message)
            if (bot_responses) {
                for (const message_node of bot_responses) {
                    const media = message_node.media
                        ? data.platform === "washima"
                            ? {
                                  base64: file2base64("static" + message_node.media.url.split("static")[1]),
                                  mimetype: message_node.media.mimetype,
                              }
                            : { url: message_node.media.url, type: message_node.media.type }
                        : undefined

                    await data.response(message_node.value, media, message_node.interactive)
                    if (message_node.actions) {
                        for (const actionDto of message_node.actions) {
                            const action = new NodeAction(actionDto)
                            action.run(data, this)
                        }
                    }
                    await sleep(2000)
                }

                if (this.expiry_minutes > 0 || this.idleness_minutes > 0) {
                    Bot.pending_response.set(current_chat.chat_id, {
                        chat_id: current_chat.chat_id,
                        response: data.response,
                        expiry: this.expiry_minutes > 0 ? now() + 1000 * 60 * this.expiry_minutes : undefined,
                        idleness: this.idleness_minutes > 0 ? now() + 1000 * 60 * this.idleness_minutes : undefined,
                        bot: this,
                        platform: data.platform,
                        platform_id: data.platform_id,
                    })
                }
            }
        }
    }

    getActiveChat(chat_id: string, incoming_message?: string) {
        const chat = this.active_on.find((item) => item.chat_id === chat_id)

        console.log({ chat })
        if (incoming_message && chat) {
            if (this.compareIncomingMessage(incoming_message, "reset") !== undefined) {
                return chat
            }
            if (this.getAnsweredNode(chat.current_node_id, incoming_message)) {
                return chat
            } else {
                return
            }
        }

        return chat
    }

    newChat(chat_id: string) {
        if (this.getActiveChat(chat_id)) return

        const chat = new ActiveBot({
            chat_id,
            current_node_id: this.instance.nodes[0].id,
            last_interaction: now(),
            started_at: now(),
        })

        this.active_on.push(chat)
        this.triggered += 1

        return chat
    }

    getNode(node_id: string) {
        return this.instance.nodes.find((node) => node.id === node_id)
    }

    getNodeChildren(nodeId: string, type: "direct" | "recursive" = "direct") {
        if (type === "direct") {
            const children_ids = this.instance.edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target)
            const children = this.instance.nodes.filter((node) => children_ids.includes(node.id))
            return children
        }

        const children = new Set<FlowNode>()
        const stack = [nodeId]

        while (stack.length > 0) {
            const currentId = stack.pop()
            if (currentId) {
                const node = this.instance.nodes.find((node) => node.id === currentId)
                if (node) {
                    children.add(node)

                    // Find children (i.e., nodes that the current node points to via edges)
                    const direct_children = this.getNodeChildren(currentId, "direct")
                    stack.push(...direct_children.map((node) => node.id))
                }
            }
        }

        return Array.from(children)
    }

    getAnsweredNode(node_id: string, incoming_message: string) {
        const children = this.getNodeChildren(node_id)
        const response_node = children.find(
            (item) => item.type === "response" && this.compareIncomingMessage(incoming_message, item.data.value) !== undefined
        )
        return response_node
    }

    advanceChat(chat: ActiveBot, incoming_message: string) {
        let answered_node: FlowNode | undefined
        if (chat.current_node_id === this.instance.nodes[0].id) {
            answered_node = this.instance.nodes[0]
        } else {
            answered_node = this.getAnsweredNode(chat.current_node_id, incoming_message)
        }

        if (answered_node) {
            const nodesData: FlowNodeData[] = []
            let current_node = answered_node
            let loop = true

            while (loop) {
                const next_node = current_node.data.next_node_id ? this.getNode(current_node.data.next_node_id) : this.getNextNode(current_node.id)
                if (!next_node) {
                    loop = false
                    this.closeChat(chat.chat_id)
                }

                if (next_node?.type === "response") {
                    loop = false
                }

                if (next_node?.type === "message") {
                    chat.current_node_id = next_node.id
                    chat.last_interaction = now()
                    current_node = next_node
                    nodesData.push(next_node.data)
                }
            }

            this.save()
            return nodesData
        } else {
            const options = this.getNodeChildren(chat.current_node_id).map((node) => node.data.value)
            console.log({ incoming_message })
            return [{ value: `Não entendi. As opções são:\n* ${options.join("\n* ")}`, media: undefined, actions: undefined, interactive: undefined }]
        }
    }

    getNextNode(node_id: string) {
        const children = this.getNodeChildren(node_id)
        if (children.length > 0) return children[0]
    }

    async save() {
        const paused_on: PausedInteraction[] = []
        this.paused_chats.forEach((item) => paused_on.push(item))
        await prisma.bot.update({
            where: { id: this.id },
            data: { active_on: JSON.stringify(this.active_on), triggered: this.triggered, paused_on: JSON.stringify(paused_on) },
        })
    }

    closeChat(chat_id: string, skip_emition = false) {
        this.active_on = this.active_on.filter((item) => item.chat_id !== chat_id)
        this.save()
        Bot.pending_response.delete(chat_id)

        if (skip_emition) return

        const io = getIoInstance()
        io.emit(`bot:activity:${chat_id}`, null)
    }

    normalize(text: string) {
        return text
            .normalize("NFD") // Decompor em caracteres normais e diacríticos.
            .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos (marcas de acento).
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, "") // Remover caracteres que não são letras, números, espaços ou hífens.
            .trim()
    }

    compareIncomingMessage(message: string, trigger = this.trigger) {
        if (trigger === "") return trigger

        const potential_triggers = trigger.split(";").map((text) => text.trim())
        console.log({ potential_triggers })

        for (trigger of potential_triggers) {
            console.log({ trigger, threshold: this.fuzzy_threshold })

            if (this.fuzzy_threshold === 0) {
                if (trigger === message) return trigger

                // return
            } else {
                const triggers = [this.normalize(trigger)]
                const fuse = new Fuse(triggers, {
                    includeScore: true,
                    threshold: this.fuzzy_threshold, // Lower threshold for closer matches
                    ignoreLocation: true, // Ignores the location of the match which allows for more general matching
                    minMatchCharLength: 2, // Minimum character length of matches to consider
                })

                const result = fuse.search(this.normalize(message)).map((item) => item.item)
                if (result.length > 0) {
                    return result[0]
                }
            }
        }
    }

    async handleBoardDelete(board_id: string) {
        let save = false
        for (const node of this.instance.nodes) {
            if (node.data.actions) {
                for (const action of node.data.actions) {
                    console.log({ action })
                    if (action.settings.board_id === board_id) {
                        action.settings.board_id = ""
                        action.settings.room_id = ""
                        action.settings.misconfigured = true
                        save = true
                    }
                }
            }
        }

        if (save) await this.update({ instance: this.instance })
    }
}
