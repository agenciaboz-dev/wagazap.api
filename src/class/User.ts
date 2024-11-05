import { Prisma } from "@prisma/client"
import { LoginForm } from "../types/shared/LoginForm"
import { prisma } from "../prisma"
import { uid } from "uid"

export type UserPrisma = Prisma.UserGetPayload<{}>

export type UserForm = Omit<User, "id">

export class User {
    id: string
    name: string
    email: string
    password: string

    static async new(data: UserForm) {
        const new_user = await prisma.user.create({
            data: {
                id: uid(),
                email: data.email,
                name: data.name,
                password: data.password,
            },
        })

        return new User(new_user)
    }

    static async login(data: LoginForm) {
        const user_data = await prisma.user.findFirst({ where: { email: data.login, password: data.password } })
        if (user_data) return new User(user_data)

        return null
    }

    static async getUsersFromWashimaId(washima_id: string) {
        const data = await prisma.user.findMany({ where: { washimas: { some: { id: washima_id } } } })
        return data.map((item) => new User(item))
    }

    constructor(data: UserPrisma) {
        this.id = data.id
        this.name = data.name
        this.email = data.email
        this.password = data.password
    }
}
