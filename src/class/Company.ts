import { Prisma } from "@prisma/client"
import { prisma } from "../prisma"
import { User, user_include, UserForm } from "./User"
import { Washima } from "./Washima/Washima"
import numeral from "numeral"
import { Nagazap, nagazap_include } from "./Nagazap"
import { WithoutFunctions } from "./helpers"
import { Address } from "./Address"
import { Bot, bot_include, BotForm } from "./Bot/Bot"
import { Log, log_include } from "./Log"
import { Department, department_include, DepartmentForm } from "./Department"

export const company_include = Prisma.validator<Prisma.CompanyInclude>()({ departments: { include: department_include } })
export type CompanyPrisma = Prisma.CompanyGetPayload<{ include: typeof company_include }>

export type CompanyForm = Omit<WithoutFunctions<Company>, "id" | "address" | "departments"> & {
    address: WithoutFunctions<Address>
    user: UserForm
}

export class Company {
    id: string
    full_name: string
    business_name: string
    document: string
    address: Address
    departments: Department[]

    static async getById(company_id: string) {
        const result = await prisma.company.findUnique({ where: { id: company_id }, include: company_include })
        if (!result) throw "empresa não encontrada"
        const company = new Company(result)
        return company
    }

    static async getCompaniesFromWashimaId(washima_id: string) {
        const data = await prisma.company.findMany({ where: { washimas: { some: { id: washima_id } } }, include: company_include })
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
            include: company_include,
        })

        const company = new Company(result)
        data.user.company_id = company.id
        const user = await company.newUser(data.user)

        return { company, user }
    }

    constructor(data: CompanyPrisma) {
        console.log(data)
        this.id = data.id
        this.full_name = data.full_name
        this.business_name = data.business_name
        this.document = data.document
        this.address = JSON.parse(data.address as string)
        this.departments = data.departments?.map((item) => new Department(item)) || []
    }

    async newUser(data: UserForm) {
        const user = await User.new(data)
        return user
    }

    async getUsers() {
        const result = await prisma.user.findMany({ where: { company_id: this.id }, include: user_include })
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

    async getLogs() {
        const result = await prisma.log.findMany({ where: { company_id: this.id }, include: log_include })
        return result.map((item) => new Log(item))
    }

    async newDepartment(data: DepartmentForm) {
        const result = await prisma.department.create({
            data: { name: data.name, company_id: this.id, users: { connect: data.users?.map((item) => ({ id: item.id })) } },
            include: department_include,
        })
        const department = new Department(result)
        return department
    }
}
