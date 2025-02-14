import { Prisma } from "@prisma/client"
import { WithoutFunctions } from "../helpers"
import { prisma } from "../../prisma"
import { now } from "lodash"
import { Washima } from "../Washima/Washima"

export const bot_include = Prisma.validator<Prisma.BotInclude>()({ washimas: { select: { id: true } }, nagazaps: { select: { id: true } } })
type BotPrisma = Prisma.BotGetPayload<{ include: typeof bot_include }>

export interface FlowResponse {
    flow: FlowObject[]
    trigger: string
}

export interface FlowObject {
    type: "message" | "response"
    message?: string
    response?: FlowResponse[]
}

export interface ActiveBot {
    chat_id: string
    flow_index: number
    last_interaction: string
    started_at: string

    nagazap_id?: string
    washima_is?: string
}

export type BotForm = Omit<WithoutFunctions<Bot>, "id" | "created_at" | "triggered" | "flow" | "active_on">

export class Bot {
    id: string
    name: string
    created_at: string
    trigger: string
    triggered: number
    flow: FlowObject[]
    active_on: ActiveBot[]
    company_id: string
    nagazap_ids: string[]
    washima_ids: string[]

    static async new(data: BotForm) {
        const result = await prisma.bot.create({
            data: {
                active_on: JSON.stringify([]),
                created_at: now().toString(),
                flow: JSON.stringify([]),
                name: data.name,
                trigger: data.trigger,
                triggered: 0,
                company_id: data.company_id,
                nagazaps: { connect: data.nagazap_ids.map((id) => ({ id })) },
                washimas: { connect: data.washima_ids.map((id) => ({ id })) },
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

    constructor(data: BotPrisma) {
        this.id = data.id
        this.name = data.name
        this.created_at = data.created_at
        this.trigger = data.trigger
        this.triggered = data.triggered
        this.flow = JSON.parse(data.flow as string)
        this.active_on = JSON.parse(data.active_on as string)
        this.company_id = data.company_id
        this.washima_ids = data.washimas.map((item) => item.id)
        this.nagazap_ids = data.nagazaps.map((item) => item.id)
    }

    load(data: BotPrisma) {
        this.id = data.id
        this.name = data.name
        this.created_at = data.created_at
        this.trigger = data.trigger
        this.triggered = data.triggered
        this.flow = JSON.parse(data.flow as string)
        this.active_on = JSON.parse(data.active_on as string)
        this.company_id = data.company_id
        this.washima_ids = data.washimas.map((item) => item.id)
        this.nagazap_ids = data.nagazaps.map((item) => item.id)
    }

    async update(data: Partial<Bot>) {
        const result = await prisma.bot.update({
            where: { id: this.id },
            data: {
                name: data.name,
                trigger: data.trigger,
                nagazaps: data.nagazap_ids ? { set: [], connect: data.nagazap_ids.map((id) => ({ id })) } : undefined,
                washimas: data.washima_ids ? { set: [], connect: data.washima_ids.map((id) => ({ id })) } : undefined,
            },
            include: bot_include,
        })

        this.load(result)
    }

    async getChannels() {
        // const washimas = Washima.washimas.filter()
    }
}
