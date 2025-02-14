import { Prisma } from "@prisma/client"
import { prisma } from "../prisma"
import { User, UserForm } from "./User"
import { Washima } from "./Washima/Washima"
import numeral from "numeral"
import { Nagazap, nagazap_include } from "./Nagazap"
import { WithoutFunctions } from "./helpers"
import { Address } from "./Address"
import { Bot, bot_include, BotForm } from "./Bot/Bot"

// export const company_include = Prisma.validator<Prisma.CompanyInclude>()({users: true})
export type CompanyPrisma = Prisma.CompanyGetPayload<{}>

export type CompanyForm = Omit<WithoutFunctions<Company>, "id" | "address"> & {
    address: WithoutFunctions<Address>
    user: UserForm
}

export class Company {
    id: string
    full_name: string
    business_name: string
    document: string
    address: Address

    static async getById(company_id: string) {
        const result = await prisma.company.findUnique({ where: { id: company_id } })
        if (!result) throw "empresa não encontrada"
        const company = new Company(result)
        return company
    }

    static async getCompaniesFromWashimaId(washima_id: string) {
        const data = await prisma.company.findMany({ where: { washimas: { some: { id: washima_id } } } })
        return data.map((item) => new Company(item))
    }

    static async signup(data: CompanyForm) {
        const result = await prisma.company.create({
            data: {
                address: JSON.stringify(data.address),
                business_name: data.business_name,
                document: data.document,
                full_name: data.full_name,
            },
        })

        const company = new Company(result)
        data.user.company_id = company.id
        const user = await company.newUser(data.user)

        return { company, user }
    }

    constructor(data: CompanyPrisma) {
        this.id = data.id
        this.full_name = data.full_name
        this.business_name = data.business_name
        this.document = data.document
        this.address = JSON.parse(data.address as string)
    }

    async newUser(data: UserForm) {
        const user = await User.new(data)
        return user
    }

    async getUsers() {
        const result = await prisma.user.findMany({ where: { company_id: this.id } })
        const users = result.map((user) => new User(user))
        return users
    }

    getWashimas() {
        const washimas = Washima.washimas.filter((washima) => washima.companies.find((user) => user.id === this.id))
        return washimas
    }

    async getWashimasCount() {
        const washimas = await prisma.washima.count({ where: { companies: { some: { id: this.id } } } })
        return washimas
    }

    async getUnrepliedCount() {
        const washimas = this.getWashimas()
        const count = washimas.reduce((total, washima) => {
            const chats = washima.chats.filter((chat) => chat.unreadCount > 0)
            return total + chats.length
        }, 0)

        return count
    }

    async getTotalStorage() {
        const washimas = this.getWashimas()
        const total_size = (
            await Promise.all(
                washimas.map(async (washima) => {
                    const metrics = await washima.getDiskUsage(false)
                    return metrics.media + metrics.messages
                })
            )
        ).reduce((total, current) => total + current, 0)

        return numeral(total_size).format("0.00 b")
    }

    async getNagazapsCount() {
        const nagazaps = await prisma.nagazap.count({ where: { company: { id: this.id } } })
        return nagazaps
    }

    async getNagazaps() {
        const nagazaps = await prisma.nagazap.findMany({ where: { company: { id: this.id } }, include: nagazap_include })
        return nagazaps.map((item) => new Nagazap(item))
    }

    async getNagazapsTemplatesCount() {
        const nagazaps = await this.getNagazaps()
        const templates = (
            await Promise.all(
                nagazaps.map(async (nagazap) => {
                    const nagazap_templates = await nagazap.getTemplates()
                    return nagazap_templates.length as number
                })
            )
        ).reduce((total, templates) => templates + total, 0)
        return templates
    }

    async getNagazapsLogsCount() {
        const nagazaps = await this.getNagazaps()
        const success = nagazaps.reduce((total, nagazap) => nagazap.sentMessages.length + total, 0)
        const error = nagazaps.reduce((total, nagazap) => nagazap.failedMessages.length + total, 0)
        return { success, error }
    }

    async getBakingMessagesCount() {
        const nagazaps = await this.getNagazaps()
        const count = nagazaps.reduce((total, nagazap) => nagazap.stack.length + total, 0)
        return count
    }

    async getBlacklistedCount() {
        const nagazaps = await this.getNagazaps()
        const count = nagazaps.reduce((total, nagazap) => nagazap.blacklist.length + total, 0)
        return count
    }

    async getBots() {
        const bots = await prisma.bot.findMany({ where: { company_id: this.id }, include: bot_include })
        return bots.map((item) => new Bot(item))
    }

    async createBot(data: BotForm) {
        const bot = await Bot.new(data)
        return bot
    }
}
