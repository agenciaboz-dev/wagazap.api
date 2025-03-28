import { Prisma } from "@prisma/client"
import { User, user_include } from "./User"
import { WithoutFunctions } from "./helpers"
import { prisma } from "../prisma"
import { now } from "lodash"

export const log_include = Prisma.validator<Prisma.LogInclude>()({ user: { include: user_include } })
export type LogPrisma = Prisma.LogGetPayload<{ include: typeof log_include }>

export type LogForm = Omit<WithoutFunctions<Log>, "id" | "user" | "timestamp" | "type"> & { type?: LogType }
export type LogType = "washima" | "nagazap" | "chatbot" | "users" | "default" | "departments" | "boards"

export class Log {
    id: string
    timestamp: number
    text: string
    type: LogType
    user_id: string
    user: User
    company_id: string

    static async new(data: LogForm) {
        try {
            const result = await prisma.log.create({
                data: {
                    text: data.text,
                    timestamp: now().toString(),
                    type: data.type,
                    company_id: data.company_id,
                    user_id: data.user_id,
                },
                include: log_include,
            })

            console.log("new log")
            const log = new Log(result)
        } catch (error) {
            console.log(error)
        }
    }

    constructor(data: LogPrisma) {
        this.id = data.id
        this.timestamp = Number(data.timestamp)
        this.text = data.text
        this.type = data.type as LogType
        this.user_id = data.user_id
        this.user = new User(data.user)
        this.company_id = data.company_id
    }
}
