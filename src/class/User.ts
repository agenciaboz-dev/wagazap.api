import { Prisma } from "@prisma/client"
import { LoginForm } from "../types/shared/LoginForm"
import { prisma } from "../prisma"
import { uid } from "uid"
import { WithoutFunctions } from "./helpers"
import { getIoInstance } from "../io/socket"

export type UserPrisma = Prisma.UserGetPayload<{}>

export type UserForm = Omit<WithoutFunctions<User>, "id" | "active"> & { company_id: string; active?: boolean }

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
        })

        return new User(new_user)
    }

    static async login(data: LoginForm) {
        const result = await prisma.user.findFirst({ where: { email: data.login, password: data.password } })
        if (result) return new User(result)

        return null
    }

    static async getAll() {
        const data = await prisma.user.findMany()
        return data.map((item) => new User(item))
    }

    static async findById(id: string) {
        const data = await prisma.user.findFirst({ where: { id } })
        if (data) return new User(data)
        return null
    }

    static async findByEmail(email: string) {
        const data = await prisma.user.findFirst({ where: { email } })
        if (data) return new User(data)
        return null
    }

    static async delete(user_id: string) {
        const result = await prisma.user.delete({ where: { id: user_id } })
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
            },
        })

        this.load(updated)
    }

    notify(reason: string, data: UserNotification) {
        const io = getIoInstance()
        io.emit(`user:${this.id}:notify:${reason}`, data)
    }
}
