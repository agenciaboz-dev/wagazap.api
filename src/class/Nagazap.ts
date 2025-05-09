import { Prisma } from "@prisma/client"
import { prisma } from "../prisma"
import axios, { AxiosError } from "axios"
import { OvenForm, WhatsappApiForm, WhatsappForm, WhatsappTemplateComponent } from "../types/shared/Meta/WhatsappBusiness/WhatsappForm"
import { UploadedFile } from "express-fileupload"
import * as fs from "fs"
import { getIoInstance } from "../io/socket"
import { FailedMessageLog, SentMessageLog } from "../types/shared/Meta/WhatsappBusiness/Logs"
import { HandledError, HandledErrorCode } from "./HandledError"
import { WithoutFunctions } from "./helpers"
import { BusinessInfo } from "../types/shared/Meta/WhatsappBusiness/BusinessInfo"
import {
    TemplateCategory,
    TemplateComponent,
    TemplateForm,
    TemplateFormResponse,
    TemplateInfo,
    TemplateParam,
} from "../types/shared/Meta/WhatsappBusiness/TemplatesInfo"
import { MediaResponse } from "../types/shared/Meta/WhatsappBusiness/MediaResponse"
import { saveFile } from "../tools/saveFile"
import * as csvWriter from "csv-writer"
import { slugify } from "../tools/slugify"
import { ObjectStringifierHeader } from "csv-writer/src/lib/record"
import path from "path"
import { Company, company_include } from "./Company"
import { Socket } from "socket.io"
import { NagazapLink } from "./NagazapLink"
import { getLocalUrl } from "../tools/getLocalUrl"
import { randomUUID } from "crypto"
import { Bot } from "./Bot/Bot"
import { now } from "lodash"
import { convertCsvToXlsx } from "@aternus/csv-to-xlsx"
import { Board } from "./Board/Board"
import { normalizePhoneNumber } from "../tools/normalize"

export type NagaMessageType = "text" | "reaction" | "sticker" | "image" | "audio" | "video" | "button" | "template"
export type NagaMessagePrisma = Prisma.NagazapMessageGetPayload<{}>
export type NagaMessageTemplate = {
    name: string
    language: {
        code: "en_US" | "pt_BR"
    }
    components?: WhatsappTemplateComponent[]
}
export type NagaMessageForm = Omit<Prisma.NagazapMessageGetPayload<{}>, "id" | "nagazap_id" | "template"> & {
    template?: NagaMessageTemplate
}
export type NagaTemplatePrisma = Prisma.NagaTemplateGetPayload<{}>
export const nagazap_include = Prisma.validator<Prisma.NagazapInclude>()({ company: { include: company_include } })
export type NagazapPrisma = Prisma.NagazapGetPayload<{ include: typeof nagazap_include }>

export interface NagazapMediaForm {
    url: string
    type: "image" | "video" | "audio" | "document"
}
export interface NagazapResponseForm {
    number: string
    text: string
    media?: NagazapMediaForm
}
interface BuildHeadersOptions {
    upload?: boolean
}

export class NagaTemplate {
    id: string
    created_at: number
    last_update: number
    sent: number
    info: TemplateInfo
    nagazap_id: string

    static async updateSentNumber(template_name: string, batch_size: number) {
        const template = await NagaTemplate.getByName(template_name)
        await template.update({ sent: template.sent + batch_size })
        return template
    }

    static async getByName(name: string, nagazap_id?: string) {
        const result = await prisma.nagaTemplate.findFirst({ where: { info: { string_contains: name }, nagazap_id } })
        if (!result) throw "template não encontrado"

        return new NagaTemplate(result)
    }

    static async getById(id: string) {
        const result = await prisma.nagaTemplate.findUnique({ where: { id } })
        if (!result) throw "template não encontrado"

        return new NagaTemplate(result)
    }

    static async new(data: TemplateInfo, nagazap_id: string) {
        const timestamp = now().toString()

        const result = await prisma.nagaTemplate.create({
            data: {
                created_at: timestamp,
                last_update: timestamp,
                info: JSON.stringify(data),
                id: data.id,
                nagazap_id: nagazap_id,
            },
        })

        return new NagaTemplate(result)
    }

    static async update(data: Omit<Partial<NagaTemplate>, "info"> & { id: string; info?: Partial<TemplateInfo> }) {
        const template = await NagaTemplate.getById(data.id)
        await template.update(data)
        return template
    }

    constructor(data: NagaTemplatePrisma) {
        this.id = data.id
        this.created_at = Number(data.created_at)
        this.last_update = Number(data.last_update)
        this.sent = data.sent
        this.info = JSON.parse(data.info as string)
        this.nagazap_id = data.nagazap_id
    }

    load(data: NagaTemplatePrisma) {
        this.id = data.id
        this.created_at = Number(data.created_at)
        this.last_update = Number(data.last_update)
        this.sent = data.sent
        this.info = JSON.parse(data.info as string)
        this.nagazap_id = data.nagazap_id
    }

    async update(data: Omit<Partial<NagaTemplate>, "info"> & { info?: Partial<TemplateInfo> }) {
        let info: TemplateInfo | undefined = undefined
        if (data.info) {
            info = this.info
            Object.entries(data.info).forEach(([key, value]) => {
                // @ts-ignore
                info[key as keyof TemplateInfo] = value
            })
        }

        const result = await prisma.nagaTemplate.update({
            where: { id: this.id },
            data: {
                sent: data.sent,
                last_update: info ? now().toString() : undefined,
                info: info ? JSON.stringify(info) : undefined,
            },
        })

        this.load(result)
    }

    convertWhatsappComponentsToTemplateInfo(formComponents: WhatsappTemplateComponent[]): TemplateInfo {
        const originalTemplate = this.info
        // Clone the original template to avoid mutation
        const convertedTemplate: TemplateInfo = {
            ...originalTemplate,
            components: originalTemplate.components.map((comp) => ({ ...comp })),
        }

        formComponents.forEach((formComp) => {
            const originalComp = convertedTemplate.components.find((c) => c.type.toLowerCase() === formComp.type)
            if (!originalComp) return

            formComp.parameters.forEach((param) => {
                const paramName = param.parameter_name
                // if (!paramName) {
                //     console.error("Parameter name is missing for:", param)
                //     return
                // }

                switch (param.type) {
                    case "text":
                    case "currency":
                    case "date_time":
                        // Handle text-based parameters
                        const value = param.text || param.currency || param.date_time || ""
                        if (originalComp.text) {
                            const placeholderRegex = new RegExp(`\\{\\{${paramName}\\}\\}`, "g")
                            originalComp.text = originalComp.text.replace(placeholderRegex, value)
                        }
                        break
                    case "image":
                    case "video":
                    case "document":
                        // Handle media parameters (update component's media property)
                        const media = param[param.type]
                        if (media) {
                            console.log({ media })
                            originalComp.text = media.link
                        }
                        break
                    default:
                        console.warn("Unhandled parameter type:", param.type)
                }
            })
        })

        return convertedTemplate
    }
}

export class NagaMessage {
    id: number
    from: string
    timestamp: string
    text: string
    name: string
    type: NagaMessageType
    nagazap_id: string
    template: TemplateInfo | null

    constructor(data: NagaMessagePrisma) {
        this.id = data.id
        this.nagazap_id = data.nagazap_id
        this.from = data.from
        this.timestamp = data.timestamp
        this.text = data.text
        this.name = data.name
        this.type = data.type as NagaMessageType
        this.template = data.template ? JSON.parse(data.template as string) : null
    }
}

const api = axios.create({
    baseURL: "https://graph.facebook.com/v19.0",
    // headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
})

export interface NagazapForm {
    token: string
    appId: string
    phoneId: string
    businessId: string
    companyId: string
}

export interface NagaChat {
    name: string
    messages: NagaMessage[]
    from: string
    lastMessage: NagaMessage
}

export interface BlacklistLog {
    timestamp: string
    number: string
    name?: string
}

export class Nagazap {
    id: string
    token: string
    appId: string
    phoneId: string
    businessId: string
    lastUpdated: string
    stack: WhatsappForm[]
    blacklist: BlacklistLog[]
    frequency: string
    batchSize: number
    lastMessageTime: string
    paused: boolean
    sentMessages: SentMessageLog[]
    failedMessages: FailedMessageLog[]

    displayName: string | null
    displayPhone: string | null

    companyId: string
    company: Company

    blacklistTrigger: string

    static async initialize() {
        await Nagazap.shouldBake()
        setInterval(() => Nagazap.shouldBake(), 1 * 5 * 1000)
    }

    static async new(data: NagazapForm) {
        const new_nagazap = await prisma.nagazap.create({
            data: {
                appId: data.appId,
                businessId: data.businessId,
                phoneId: data.phoneId,
                token: data.token,
                companyId: data.companyId,

                batchSize: 20,
                frequency: "30",
                paused: true,
                lastUpdated: new Date().getTime().toString(),
                lastMessageTime: "",

                blacklist: "[]",
                failedMessages: "[]",
                sentMessages: "[]",
                stack: "[]",
            },
            include: nagazap_include,
        })

        const nagazap = new Nagazap(new_nagazap)
        const info = await nagazap.getInfo()
        if (!!info?.phone_numbers.data.length) {
            const phone = info.phone_numbers.data[0]
            await nagazap.update({ displayName: phone.verified_name, displayPhone: phone.display_phone_number })
            return nagazap
        } else {
            await prisma.nagazap.delete({ where: { id: nagazap.id } })
            throw new HandledError({
                code: HandledErrorCode.nagazap_no_info,
                text: "Não foi possível realizar o cadastrado, verifique os dados enviados.",
            })
        }
    }

    static async getByBusinessId(business_id: string) {
        const data = await prisma.nagazap.findFirst({ where: { businessId: business_id }, include: nagazap_include })
        if (data) {
            return new Nagazap(data)
        } else {
            throw new HandledError({ code: HandledErrorCode.nagazap_not_found, text: "Nagazap não encontrado" })
        }
    }

    static async getById(id: string) {
        const data = await prisma.nagazap.findUnique({ where: { id }, include: nagazap_include })
        if (data) {
            return new Nagazap(data)
        } else {
            throw new HandledError({ code: HandledErrorCode.nagazap_not_found, text: "Nagazap não encontrado" })
        }
    }

    static async getByCompanyId(company_id: string) {
        const data = await prisma.nagazap.findMany({ where: { companyId: company_id }, include: nagazap_include })
        return data.map((item) => new Nagazap(item))
    }

    static async getAll() {
        const data = await prisma.nagazap.findMany({ include: nagazap_include })
        return data.map((item) => new Nagazap(item))
    }

    static async shouldBake() {
        const nagazaps = await Nagazap.getAll()
        nagazaps.forEach((nagazap) => {
            try {
                if (!nagazap.stack.length) return

                const lastTime = new Date(Number(nagazap.lastMessageTime || 0))
                const now = new Date()
                if (now.getTime() >= lastTime.getTime() + Number(nagazap.frequency) * 1000 * 60 && !!nagazap.stack.length && !nagazap.paused) {
                    nagazap.bake()
                }
            } catch (error) {
                if (error instanceof HandledError && error.code === HandledErrorCode.nagazap_not_found) {
                } else {
                    console.log(error)
                }
            }
        })
    }

    static async delete(id: string) {
        const data = await prisma.nagazap.delete({ where: { id } })
        return data
    }

    static async sendResponse(id: string, data: NagazapResponseForm, socket?: Socket) {
        const nagazap = await Nagazap.getById(id)
        await nagazap.sendResponse(data)
    }

    constructor(data: NagazapPrisma) {
        this.id = data.id
        this.token = data.token
        this.appId = data.appId
        this.phoneId = data.phoneId
        this.businessId = data.businessId
        this.lastUpdated = data.lastUpdated
        this.stack = JSON.parse(data.stack)

        this.frequency = data.frequency
        this.batchSize = data.batchSize
        this.lastMessageTime = data.lastMessageTime
        this.paused = data.paused
        this.sentMessages = JSON.parse(data.sentMessages)
        this.failedMessages = JSON.parse(data.failedMessages)
        this.companyId = data.companyId
        this.company = new Company(data.company)
        this.displayName = data.displayName
        this.displayPhone = data.displayPhone
        this.blacklistTrigger = data.blacklistTrigger

        this.blacklist = this.loadBlacklist(JSON.parse(data.blacklist))
    }

    loadBlacklist(saved_list: any[]) {
        const old_format = saved_list.filter((item) => typeof item === "string")
        const new_format = saved_list.filter((item) => !!item.timestamp) as BlacklistLog[]

        const first_message = !!this.sentMessages.length
            ? this.sentMessages?.reduce((previous, current) => (previous.timestamp < current.timestamp ? previous : current))
            : null

        const new_list: BlacklistLog[] = [
            ...old_format.map((item) => {
                const matching_number_message = this.sentMessages.find((message) => message.data.contacts[0].wa_id.slice(2) === item)
                return { number: item, timestamp: matching_number_message?.timestamp || first_message?.timestamp || "0", name: item }
            }),
            ...new_format,
        ]

        return new_list
    }

    async getConversations(messages?: NagaMessage[]) {
        if (!messages) {
            const data = await prisma.nagazapMessage.findMany({ where: { nagazap_id: this.id } })
            messages = data.map((item) => new NagaMessage(item))
        }

        const conversations = new Map<string, NagaMessage[]>()
        messages.forEach((message) => {
            const normalizedFrom = normalizePhoneNumber(message.from)
            if (!conversations.has(normalizedFrom)) {
                conversations.set(normalizedFrom, [])
            }
            conversations.get(normalizedFrom)!.push(message)
        })

        return conversations
    }

    filterTemplatesOnlyMessages(conversations: Map<string, NagaMessage[]>) {
        const validMessages: NagaMessage[] = []
        for (const [contact, convMessages] of conversations) {
            const hasHumanReply = convMessages.some((msg) => !this.isMessageFromMe(msg) || msg.type !== "template")

            if (hasHumanReply) {
                validMessages.push(...convMessages)
            }
        }

        return validMessages
    }

    async getMessages(from?: string) {
        const data = await prisma.nagazapMessage.findMany({
            where: {
                nagazap_id: this.id,
                from: from
                    ? { in: [normalizePhoneNumber(from).slice(0, 2) + "9" + normalizePhoneNumber(from).slice(2), normalizePhoneNumber(from)] }
                    : undefined,
            },
        })
        const messages = data.map((item) => new NagaMessage(item))
        const conversations = await this.getConversations(messages)

        const filteredMessages = this.filterTemplatesOnlyMessages(conversations)
        console.log({ from, messages, conversations, filteredMessages })

        return filteredMessages
    }

    async update(data: Partial<WithoutFunctions<Nagazap>>) {
        const updated = await prisma.nagazap.update({
            where: { id: this.id },
            data: {
                token: data.token,
                displayName: data.displayName,
                displayPhone: data.displayPhone,
                lastUpdated: new Date().getTime().toString(),
                blacklistTrigger: data.blacklistTrigger,
                batchSize: data.batchSize,
                frequency: data.frequency,
            },
        })
        this.token = updated.token
        this.displayName = updated.displayName
        this.displayPhone = updated.displayPhone
        this.lastUpdated = updated.lastUpdated
        this.blacklistTrigger = updated.blacklistTrigger
        this.batchSize = updated.batchSize
        this.frequency = updated.frequency
        this.emit()
        return this
    }

    async updateToken(token: string) {
        const data = await prisma.nagazap.update({ where: { id: this.id }, data: { token, lastUpdated: new Date().getTime().toString() } })
        this.token = data.token
        this.lastUpdated = data.lastUpdated
        this.emit()
    }

    buildHeaders(options?: BuildHeadersOptions) {
        return { Authorization: `Bearer ${this.token}`, "Content-Type": options?.upload ? "multipart/form-data" : "application/json" }
    }

    async getInfo() {
        try {
            const response = await api.get(`/${this.businessId}?fields=id,name,phone_numbers`, {
                headers: this.buildHeaders(),
            })

            return response.data as BusinessInfo
        } catch (error) {
            console.log(JSON.stringify(error, null, 4))
        }
    }

    isMessageFromMe(message: NagaMessage) {
        return message.name === this.displayPhone
    }

    async saveMessage(data: NagaMessageForm) {
        let template: TemplateInfo | undefined
        if (data.template) {
            const original_template = await this.getTemplateByName(data.template.name)
            template = original_template.convertWhatsappComponentsToTemplateInfo(data.template.components || [])
        }

        const prisma_message = await prisma.nagazapMessage.create({
            data: {
                ...data,
                nagazap_id: this.id,
                from: normalizePhoneNumber(data.from),
                timestamp: (Number(data.timestamp) * 1000).toString(),
                template: template ? JSON.stringify(template) : undefined,
            },
        })

        const message = new NagaMessage(prisma_message)
        console.log(JSON.stringify(message))
        const io = getIoInstance()
        io.emit(`nagazap:${this.id}:message`, message)

        if (message.text.toLowerCase() == this.blacklistTrigger) {
            this.addToBlacklist(message.from, message.name)
        }

        if (!this.isMessageFromMe(message)) {
            const bots = await Bot.getByNagazap(this.id)
            bots.forEach((bot) => {
                bot.handleIncomingMessage({
                    platform: "nagazap",
                    platform_id: this.id,
                    message: message.text,
                    chat_id: message.from,
                    response: (text, media) => this.sendResponse({ number: message.from, text, media: media as NagazapMediaForm }),
                    other_bots: bots.filter((item) => item.id !== bot.id),
                })
            })
        }

        Board.handleNagazapNewMessage(message, this.companyId)

        return message
    }

    async addToBlacklist(number: string, name: string) {
        if (this.blacklist.find((item) => item.number === number)) return
        this.blacklist.push({ number, timestamp: new Date().getTime().toString(), name })
        await prisma.nagazap.update({ where: { id: this.id }, data: { blacklist: JSON.stringify(this.blacklist) } })
        console.log(`número ${number} adicionado a blacklist`)
        this.emit()
    }

    async removeFromBlacklist(number: string) {
        if (!this.blacklist.find((item) => item.number === number)) return
        this.blacklist = this.blacklist.filter((item) => item.number != number)
        await prisma.nagazap.update({ where: { id: this.id }, data: { blacklist: JSON.stringify(this.blacklist) } })
        console.log(`número ${number} removido da blacklist`)
        this.emit()
    }

    async getMetaTemplates() {
        const response = await api.get(`/${this.businessId}?fields=id,name,message_templates`, {
            headers: this.buildHeaders(),
        })

        const templates = response.data.message_templates.data as TemplateInfo[]
        return templates
    }

    async getMetaTemplate(template_id: string) {
        const templates: TemplateInfo[] = await this.getMetaTemplates()
        const template = templates.find((item) => item.id === template_id)
        if (!template) throw "template não encontrado"

        return template
    }

    async uploadMedia(file: UploadedFile, filepath: string) {
        const response = await api.post(
            `/${this.phoneId}/media`,
            {
                messaging_product: "whatsapp",
                type: file.mimetype,
                file: fs.createReadStream(filepath),
            },
            { headers: this.buildHeaders({ upload: true }) }
        )
        return response.data.id as string
    }

    async sendMessage(message: WhatsappForm) {
        const number = message.number.toString().replace(/\D/g, "")
        if (this.blacklist.find((item) => item.number === (number.length == 10 ? number : number.slice(0, 2) + number.slice(3)))) {
            console.log(`mensagem não enviada para ${number} pois está na blacklist`)
            return
        }

        const form: WhatsappApiForm = {
            messaging_product: "whatsapp",
            template: {
                language: { code: message.language },
                name: message.template,
                components: message.components,
            },
            type: "template",
            to: "+55" + number,
        }

        try {
            const whatsapp_response = await api.post(`/${this.phoneId}/messages`, form, { headers: this.buildHeaders() })
            this.log(whatsapp_response.data, message.template)
            await this.saveMessage({
                from: number,
                name: this.displayPhone!,
                text: "",
                timestamp: (new Date().getTime() / 1000).toString(),
                type: "template",
                template: form.template,
                from_bot: null,
            })
        } catch (error) {
            if (error instanceof AxiosError) {
                console.log(error.response?.data)
                this.errorLog(error.response?.data, number)
            } else {
                console.log(error)
            }
        }
    }

    async queueMessage(data: WhatsappForm) {
        this.stack.push(data)
        await prisma.nagazap.update({ where: { id: this.id }, data: { stack: JSON.stringify(this.stack) } })

        return this.stack
    }

    async queueBatch(data: WhatsappForm[]) {
        this.stack = [...this.stack, ...data]
        await prisma.nagazap.update({ where: { id: this.id }, data: { stack: JSON.stringify(this.stack) } })

        return this.stack
    }

    async prepareBatch(data: OvenForm, image_id = "", image_url?: string) {
        const template = await this.getTemplate(data.template_id)
        const template_info = template.info

        console.log(JSON.stringify(data, null, 4))
        const forms: WhatsappForm[] = data.to.map((item) => {
            return {
                number: item.telefone,
                template: template_info.name,
                language: template_info.language,
                components: template_info.components
                    .filter((component) => component.format == "IMAGE" || component.example)
                    .map((component) => {
                        const param_type = component.type === "HEADER" ? "header_text_named_params" : "body_text_named_params"

                        const component_data: WhatsappTemplateComponent = {
                            type: component.type.toLowerCase() as "header" | "body" | "footer",
                            parameters:
                                component.format === "IMAGE"
                                    ? [{ type: "image", image: { link: image_url } }]
                                    : component.example
                                    ? component.example[param_type]?.map((example) => ({
                                          type: "text",
                                          parameter_name: example.param_name,
                                          text: item[example.param_name],
                                      })) || []
                                    : [],
                        }
                        return component_data
                    }),
            }
        })

        console.log(forms)

        await this.queueBatch(forms)
    }

    async saveStack() {
        this.lastMessageTime = new Date().getTime().toString()
        const data = await prisma.nagazap.update({
            where: { id: this.id },
            data: { stack: JSON.stringify(this.stack), lastMessageTime: this.lastMessageTime },
        })
        this.emit()
    }

    async bake() {
        const batch = this.stack.slice(0, this.batchSize)
        const sent = await Promise.all(batch.map(async (message) => this.sendMessage(message)))

        const template = batch[0].template
        NagaTemplate.updateSentNumber(template, batch.length)

        this.stack = this.stack.slice(this.batchSize)
        await this.saveStack()
        if (this.stack.length === 0) {
            await this.pause()
        }

        ;(await this.company.getUsers()).forEach((user) =>
            user.notify("nagazap-batch", { title: "Nagazap: Forno", body: `${sent.length} mensagens foram enviadas.` })
        )
    }

    async pause() {
        this.paused = true
        await prisma.nagazap.update({ where: { id: this.id }, data: { paused: this.paused } })
        this.emit()
    }

    async start() {
        this.paused = false
        await prisma.nagazap.update({ where: { id: this.id }, data: { paused: this.paused } })
        this.emit()
    }

    async clearOven() {
        this.stack = []
        await prisma.nagazap.update({ where: { id: this.id }, data: { stack: JSON.stringify(this.stack) } })
        this.emit()
    }

    async log(data: any, template_name: string) {
        this.sentMessages.push({ timestamp: new Date().getTime().toString(), data, template_name })
        await prisma.nagazap.update({ where: { id: this.id }, data: { sentMessages: JSON.stringify(this.sentMessages) } })
    }

    async errorLog(data: any, number: string) {
        this.failedMessages.push({ timestamp: new Date().getTime().toString(), data, number })
        await prisma.nagazap.update({ where: { id: this.id }, data: { failedMessages: JSON.stringify(this.failedMessages) } })
    }

    async createTemplate(data: TemplateForm) {
        await Promise.all(
            data.components.map(async (component, component_index) => {
                if (component.buttons) {
                    await Promise.all(
                        component.buttons.map(async (button, button_index) => {
                            if (button.url) {
                                const link = await this.newLink(button.url, data.name)
                                data.components[component_index].buttons![button_index].url = link.new_url
                            }
                        })
                    )
                }
            })
        )

        const response = await api.post(`/${this.businessId}/message_templates`, data, {
            headers: this.buildHeaders(),
        })
        const result = response.data as TemplateFormResponse
        const template = await NagaTemplate.new({ ...data, ...result }, this.id)

        return template
    }

    async updateTemplate(template_id: string, data: { components?: TemplateComponent[]; category?: TemplateCategory }) {
        const template = await NagaTemplate.getById(template_id)

        if (data.components) {
            await Promise.all(
                data.components.map(async (component, component_index) => {
                    if (component.buttons) {
                        await Promise.all(
                            component.buttons.map(async (button, button_index) => {
                                if (button.url) {
                                    try {
                                        const link = await this.newLink(button.url, template.info.name)
                                        data.components![component_index].buttons![button_index].url = link.new_url
                                    } catch (error) {}
                                }
                            })
                        )
                    }
                })
            )
        }

        if (template.info.status === "APPROVED" && data.category) {
            delete data.category
        }

        const response = await api.post(`/${template_id}`, data, {
            headers: this.buildHeaders(),
        })
        const result = response.data as TemplateFormResponse
        await template.update({ info: { status: "PENDING", category: result.category }, last_update: now() })

        return template
    }

    getTemplateSheet(template_name: string, type = "csv") {
        const basePath = `static/nagazap/${slugify(this.displayName || this.displayPhone || this.id.toString())}/templates`
        const fullPath = path.join(basePath, `${template_name}.${type}`)

        fs.mkdirSync(basePath, { recursive: true })

        return fullPath
    }

    async exportTemplateModel(template: TemplateForm, type = "csv") {
        let fullPath = this.getTemplateSheet(template.name, "csv")

        if (type === "csv") {
            const components = template.components.filter(
                (item) => !!item.example?.body_text_named_params?.length || !!item.example?.header_text_named_params?.length
            )

            const example: { [key: string]: string }[] = [{ telefone: "41999999999" }]

            const params: ObjectStringifierHeader = components
                .map((component) => {
                    const header = component.example!.header_text_named_params
                    const body = component.example!.body_text_named_params

                    const values = (header || body) as TemplateParam[]

                    return values.map((param) => {
                        example[0][param.param_name] = param.example
                        return { id: param.param_name, title: param.param_name }
                    })
                })
                .flatMap((item) => item)

            const writer = csvWriter.createObjectCsvWriter({
                path: fullPath,
                header: [{ id: "telefone", title: "telefone" }, ...params],
            })

            await writer.writeRecords(example)
        }

        if (type === "xlsx") {
            const destination = this.getTemplateSheet(template.name, "xlsx")
            convertCsvToXlsx(fullPath, destination, { sheetName: `${template.name}` })
            fullPath = destination
        }

        return fullPath
    }

    async uploadTemplateMedia(file: UploadedFile) {
        const session_id_response = await api.post(
            `/${this.appId}/uploads?file_name=${file.name}&file_length=${file.size}&file_type=${file.mimetype}&access_token=${this.token}`
        )
        const session_id = session_id_response.data.id as string

        const upload_response = await api.post(`/${session_id}`, file.data, {
            headers: { Authorization: `OAuth ${this.token}`, "Content-Type": "application/octet-stream" },
        })
        return upload_response.data
    }

    async downloadMedia(media_id: string) {
        const response = await api.get(`/${media_id}`, { headers: this.buildHeaders() })
        const media_object = response.data as MediaResponse
        const media_response = await axios.get(media_object.url, { headers: { Authorization: `Bearer ${this.token}` }, responseType: "arraybuffer" })
        const { url } = saveFile(`nagazap/${this.id}/media`, {
            file: media_response.data,
            name: media_object.id + "." + media_object.mime_type.split("/")[1].split(";")[0],
        })
        return url
    }

    emit() {
        const io = getIoInstance()
        io.emit(`nagazap:${this.id}:update`, this)
    }

    async sendResponse(data: NagazapResponseForm, socket?: Socket) {
        const number = data.number.toString().replace(/\D/g, "")
        if (this.blacklist.find((item) => item.number === (number.length == 10 ? number : number.slice(0, 2) + number.slice(3)))) {
            console.log(`mensagem não enviada para ${number} pois está na blacklist`)
            return
        }

        const form: WhatsappApiForm = {
            messaging_product: "whatsapp",
            type: data.media ? data.media.type : "text",
            to: "+55" + number,
            recipient_type: "individual",
        }

        if (form.type === "text") {
            form.text = { preview_url: true, body: data.text }
        }

        if (form.type === "image" || form.type === "video") {
            form[form.type] = { link: data.media?.url, caption: data.text }
        }

        const message = await this.saveMessage({
            from: number,
            name: this.displayPhone!,
            text: data.text,
            timestamp: (new Date().getTime() / 1000).toString(),
            type: "text",
            from_bot: null,
        })
        socket?.emit("nagazap:response", message)

        try {
            const whatsapp_response = await api.post(`/${this.phoneId}/messages`, form, { headers: this.buildHeaders() })
            // this.log(whatsapp_response.data)
        } catch (error) {
            if (error instanceof AxiosError) {
                console.log(error.response?.data)
                // this.errorLog(error.response?.data, number)
            } else {
                console.log(error)
            }
        }
    }

    async getLinks() {
        const result = await prisma.nagazapLink.findMany({ where: { nagazap_id: this.id } })
        return result.map((item) => new NagazapLink(item))
    }

    async newLink(url: string, template_name?: string) {
        const existing_link = await this.findOriginalLink(url)
        if (existing_link) return existing_link

        const result = await prisma.nagazapLink.create({
            data: {
                clicks: JSON.stringify([]),
                created_at: new Date().getTime().toString(),
                original_url: url,
                nagazap_id: this.id,
                new_url: `${getLocalUrl()}/nagazap/links/${randomUUID()}`,
                template_name,
            },
        })

        return new NagazapLink(result)
    }

    async findOriginalLink(url: string) {
        const result = await prisma.nagazapLink.findFirst({ where: { original_url: url, nagazap_id: this.id } })
        if (result) return new NagazapLink(result)
    }

    async getTemplates() {
        const result = await prisma.nagaTemplate.findMany({ where: { nagazap_id: this.id } })
        return result.map((item) => new NagaTemplate(item))
    }

    async getTemplate(id: string) {
        return await NagaTemplate.getById(id)
    }

    async getTemplateByName(name: string) {
        return await NagaTemplate.getByName(name, this.id)
    }

    async syncTemplates() {
        const meta_templates = await this.getMetaTemplates()
        for (const template of meta_templates) {
            try {
                await NagaTemplate.new(template, this.id)
            } catch (error) {
                const result = await NagaTemplate.update({ id: template.id, info: template })
                if (template.name === "pombo") {
                }
            }
        }
    }

    async deleteTemplate(template_id: string) {
        const template = await this.getTemplate(template_id)
        const response = await api.delete(`/${this.businessId}/message_templates`, {
            headers: this.buildHeaders(),
            params: { name: template.info.name },
        })
        const deleted = await prisma.nagaTemplate.delete({ where: { id: template.id } })
        return new NagaTemplate(deleted)
    }

    async getLastTemplateSentToNumber(number: string) {
        console.log(number)
        console.log(this.sentMessages[0])
        const lastLog = this.sentMessages
            .filter((item) => item.data.contacts[0].wa_id === number)
            .reduce((last, log) => (last.timestamp >= log.timestamp ? last : log))
        console.log(lastLog)
    }
}
