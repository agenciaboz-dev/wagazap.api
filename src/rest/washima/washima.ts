import express, { Express, Request, Response } from "express"
import { Washima, WashimaForm } from "../../class/Washima/Washima"
import { prisma } from "../../prisma"
import { getIoInstance } from "../../io/socket"
import tools from "./tools"
import { User } from "../../class/User"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { Log } from "../../class/Log"

const router = express.Router()

router.use("/tools", tools)

router.get("/", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const company_id = request.query.company_id as string | undefined

    if (washima_id) {
        try {
            const washima = Washima.find(washima_id)
            response.json(washima)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        if (company_id) {
            const not_instanced = await prisma.washima.findMany({
                where: {
                    companies: {
                        some: {
                            id: company_id,
                        },
                    },
                },
            })
            const instanced = Washima.washimas.filter((washima) => washima.companies.find((company) => company.id === company_id))
            const washimas = not_instanced.map((washima) => {
                const runningClient = Washima.washimas.find((w) => w.id === washima.id)
                return runningClient ? runningClient : new Washima(washima)
            })

            washimas.forEach((washima) => {
                if (!instanced.some((item) => item.id === washima.id)) {
                    washima.status = "loading"
                }
            })
            return response.json(washimas)
        }
    }
})

router.get("/init-status", async (request: Request, response: Response) => {
    try {
        const initializing = Washima.initializing
        const waitingList = Washima.waitingList
        return response.json({ initializing, waitingList })
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/profile-pic", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const chat_id = request.query.chat_id as string | undefined
    const message_id = request.query.message_id as string | undefined

    if (washima_id) {
        try {
            const washima = Washima.find(washima_id)
            if (washima) {
                const picture = await washima.getContactPicture(
                    message_id || chat_id || washima.client.info.wid._serialized,
                    message_id ? "message" : "chat"
                )
                response.json(picture)
            }
        } catch (error) {
            // console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("washima_id param is required")
    }
})

router.get("/chat", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const chat_id = request.query.chat_id as string | undefined
    const is_group = request.query.is_group as string | undefined
    const offset = request.query.offset as string | undefined
    const take = request.query.take as string | undefined

    if (washima_id) {
        const washima = Washima.find(washima_id)
        if (washima) {
            if (chat_id) {
                try {
                    const chat = await washima.buildChat(chat_id, Number(offset || 0))
                    response.json(chat)
                } catch (error) {
                    console.log(error)
                    response.status(500).send(error)
                }
            } else {
                try {
                    console.log(offset, take)
                    const chats = washima.chats
                        .sort((a, b) => b.lastMessage?.timestamp - a.lastMessage?.timestamp)
                        .slice(Number(offset || 0), Number(offset || 0) + Number(take || 0))
                    response.json(chats)
                } catch (error) {
                    console.log(error)
                    response.status(500).send(error)
                }
            }
        }
    } else {
        response.status(400).send("washima_id param is required")
    }
})

router.get("/media", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const message_id = request.query.message_id as string | undefined

    if (washima_id && message_id) {
        try {
            const washima = Washima.find(washima_id)
            if (washima) {
                const message = await washima.getMessage(message_id)
                const media = await washima.getMedia(message)
                if (media) {
                    response.setHeader("Content-Type", media.mimetype)
                    response.setHeader("Content-Disposition", `inline; filename=${media.filename || "media"}`)
                    const mediaBuffer = Buffer.from(media.data, "base64")
                    response.send(mediaBuffer)
                } else {
                    response.status(404).send("Media not found")
                }
            }
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("washima_id and message_id params are required")
    }
})

router.get("/media-metadata", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const message_id = request.query.message_id as string | undefined

    if (washima_id && message_id) {
        try {
            const washima = Washima.find(washima_id)
            if (washima) {
                const media_data = await washima.getMediaMeta(message_id)
                response.json(media_data)
            }
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("washima_id and message_id params are required")
    }
})

router.get("/search", async (request: Request, response: Response) => {
    const washima_id = request.query.washima_id as string | undefined
    const search = request.query.search as string | undefined
    const target = request.query.target as "chats" | "messages" | undefined
    const chat_id = request.query.chat_id as string | undefined

    if (washima_id && search) {
        try {
            const washima = Washima.find(washima_id)
            if (washima) {
                const result = await washima.search(search, target, chat_id)
                response.json(result)
            }
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("washima_id param is required")
    }
})

router.post("/fetch-messages-whatsappweb", async (request: UserRequest, response: Response) => {
    const data = request.body as { id: string; options?: { groupOnly?: boolean } }

    try {
        const washima = Washima.find(data.id)
        if (washima) {
            const messages = await washima.fetchAndSaveAllMessages(data.options)
            response.json(messages)
            return
        }

        response.send(null)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireUserId)

router.post("/", async (request: UserRequest, response: Response) => {
    const data = request.body as WashimaForm

    try {
        const washima = await Washima.new(data)
        Log.new({
            company_id: data.company_id,
            user_id: request.user!.id,
            text: `criou um novo Business`,
            type: "washima",
        })
        response.json(washima)

        const io = getIoInstance()
        io.emit("washima:update", washima)

        await washima.initialize()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/", async (request: UserRequest, response: Response) => {
    const data = request.body as Partial<Washima> & { id: string }

    try {
        const washima = Washima.find(data.id)
        await washima?.update(data)
        if (washima) {
            Log.new({
                company_id: washima.companies[0].id,
                user_id: request.user!.id,
                text: `editou ${washima.name} - ${washima.number} no Business`,
                type: "washima",
            })
        }
        response.json(washima)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: UserRequest, response: Response) => {
    const data = request.body as { washima_id: string }

    try {
        const washima = await Washima.delete(data.washima_id)
        if (washima) {
            Log.new({
                company_id: washima.companies[0].id,
                user_id: request.user!.id,
                text: `deletou ${washima.name} - ${washima.number} no Business`,
                type: "washima",
            })
        }
        response.json(washima)
        const io = getIoInstance()
        io.emit("washima:delete", washima)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.post("/restart", async (request: UserRequest, response: Response) => {
    const data = request.body as { washima_id: string }

    try {
        const washima = Washima.find(data.washima_id)
        if (washima) {
            Log.new({
                company_id: washima.companies[0].id,
                user_id: request.user!.id,
                text: `reiniciou ${washima.name} - ${washima.number} no Business`,
                type: "washima",
            })
        }

        await washima?.restart()

        response.json(washima)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
