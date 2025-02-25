import { Prisma } from "@prisma/client"
import { User } from "./User"
import { WithoutFunctions } from "./helpers"
import { prisma } from "../prisma"
import { now } from "lodash"

export const log_include = Prisma.validator<Prisma.LogInclude>()({ user: true })
export type LogPrisma = Prisma.LogGetPayload<{ include: typeof log_include }>
export type MuiColor = "primary" | "secondary" | "info" | "warning" | "error" | "success"

export type LogForm = Omit<WithoutFunctions<Log>, "id" | "user" | "timestamp" | "color"> & { color?: MuiColor }

export class Log {
    id: string
    timestamp: number
    text: string
    color: MuiColor
    user_id: string
    user: User
    company_id: string

    static async new(data: LogForm) {
        try {
            const result = await prisma.log.create({
                data: {
                    text: data.text,
                    timestamp: now().toString(),
                    color: data.color,
                    company_id: data.company_id,
                    user_id: data.user_id,
                },
                include: log_include,
            })

            console.log("new log")
            const log = new Log(result)
            console.log(log)
        } catch (error) {
            console.log(error)
        }
    }

    constructor(data: LogPrisma) {
        this.id = data.id
        this.timestamp = Number(data.timestamp)
        this.text = data.text
        this.color = data.color as MuiColor
        this.user_id = data.user_id
        this.user = new User(data.user)
        this.company_id = data.company_id
    }
}
