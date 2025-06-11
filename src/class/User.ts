import { Prisma } from "@prisma/client"
import { LoginForm } from "../types/shared/LoginForm"
import { prisma } from "../prisma"
import { WithoutFunctions } from "./helpers"
import { getIoInstance } from "../io/socket"
import { Department, department_include } from "./Department"
import { Board } from "./Board/Board"
import { Washima } from "./Washima/Washima"

export const user_include = Prisma.validator<Prisma.UserInclude>()({ departments: { include: department_include } })
export type UserPrisma = Prisma.UserGetPayload<{ include: typeof user_include }>

export type UserForm = Omit<WithoutFunctions<User>, "id" | "active" | "departments"> & { company_id: string; active?: boolean }

export interface UserNotification {
    title: string
    body: string
}

export class User {
    id: string
    name: string
    email: string
    password: string
    admin: boolean
    owner: boolean
    company_id: string
    active: boolean
    departments: Department[]

    static async new(data: UserForm) {
        const new_user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: data.password,
                company_id: data.company_id,
                admin: data.admin,
                owner: data.owner,
            },
            include: user_include,
        })

        return new User(new_user)
    }

    static async login(data: LoginForm) {
        const result = await prisma.user.findFirst({ where: { email: data.login, password: data.password }, include: user_include })
        if (result) return new User(result)

        return null
    }

    static async getAll() {
        const data = await prisma.user.findMany({ include: user_include })
        return data.map((item) => new User(item))
    }

    static async findById(id: string) {
        const data = await prisma.user.findFirst({ where: { id }, include: user_include })
        if (data) return new User(data)
        return null
    }

    static async findByEmail(email: string) {
        const data = await prisma.user.findFirst({ where: { email }, include: user_include })
        if (data) return new User(data)
        return null
    }

    static async delete(user_id: string) {
        const result = await prisma.user.delete({ where: { id: user_id }, include: user_include })
        return new User(result)
    }

    constructor(data: UserPrisma) {
        this.id = data.id
        this.name = data.name
        this.email = data.email
        this.password = data.password
        this.admin = data.admin
        this.owner = data.owner
        this.company_id = data.company_id
        this.active = data.active
        this.departments = data.departments?.map((item) => new Department(item)) || []
    }

    load(data: UserPrisma) {
        this.id = data.id
        this.name = data.name
        this.email = data.email
        this.password = data.password
        this.admin = data.admin
        this.owner = data.owner
        this.company_id = data.company_id
        this.active = data.active
        this.departments = data.departments?.map((item) => new Department(item)) || []
    }

    async update(data: Partial<User>) {
        const updated = await prisma.user.update({
            where: { id: this.id },
            data: {
                admin: data.admin,
                email: data.email,
                name: data.name,
                password: data.password,
                active: data.active,
                departments: data.departments ? { set: [], connect: data.departments.map((item) => ({ id: item.id })) } : undefined,
            },
            include: user_include,
        })

        this.load(updated)
    }

    notify(reason: string, data: UserNotification) {
        const io = getIoInstance()
        io.emit(`user:${this.id}:notify:${reason}`, data)
    }

    async getBoards() {
        let boards: Board[]
        if (this.admin) {
            const result = await prisma.board.findMany({ where: { company_id: this.company_id } })
            boards = result.map((item) => new Board(item))
        } else {
            const result = await prisma.board.findMany({
                where: { OR: [{ users: { some: { id: this.id } } }, { departments: { some: { users: { some: { id: this.id } } } } }] },
            })
            boards = result.map((item) => new Board(item))
        }

        return boards
    }

    async getWashimas() {
        let washimas: Washima[]
        if (this.admin) {
            const result = await prisma.washima.findMany({ where: { companies: { some: { id: this.company_id } } } })
            washimas = result.map((item) => new Washima(item))
        } else {
            const result = await prisma.washima.findMany({
                where: { OR: [{ users: { some: { id: this.id } } }, { departments: { some: { users: { some: { id: this.id } } } } }] },
            })
            washimas = result.map((item) => new Washima(item))
        }

        return washimas
    }
}
