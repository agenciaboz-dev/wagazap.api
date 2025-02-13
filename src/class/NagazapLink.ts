import { Prisma } from "@prisma/client"
import { prisma } from "../prisma"

export interface NagazapLinkClick {
    timestamp: number
}

type NagazapLinkPrisma = Prisma.NagazapLinkGetPayload<{}>

export class NagazapLink {
    original_url: string
    new_url: string
    created_at: string
    clicks: NagazapLinkClick[]
    nagazap_id: string

    static async findLink(url: string) {
        const result = await prisma.nagazapLink.findUnique({ where: { new_url: url } })
        if (!result) throw "link não encontrado"

        return new NagazapLink(result)
    }

    constructor(data: NagazapLinkPrisma) {
        this.original_url = data.original_url
        this.new_url = data.new_url
        this.created_at = data.created_at
        this.clicks = JSON.parse(data.clicks as string)
        this.nagazap_id = data.nagazap_id

        console.log(this)
    }

    async click() {
        this.clicks.push({ timestamp: new Date().getTime() })
        await prisma.nagazapLink.update({ where: { new_url: this.new_url }, data: { clicks: JSON.stringify(this.clicks) } })
    }
}
