import express, { Express, Request, Response } from "express"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import { Bot, BotForm } from "../../class/Bot/Bot"
import { BotRequest, requireBotId } from "../../middlewares/requireBotId"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { Log } from "../../class/Log"

const router = express.Router()
router.use(requireCompanyId) // requiring company ID

router.get("/", async (request: CompanyRequest, response: Response) => {
    const { bot_id } = request.query

    try {
        if (bot_id) {
            const bot = await Bot.getById(bot_id as string)
            response.json(bot)
        } else {
            const bots = await request.company!.getBots()
            response.json(bots)
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireUserId) // requiring user ID

router.post("/", async (request: CompanyRequest & UserRequest, response: Response) => {
    const data = request.body as BotForm

    try {
        const bot = await request.company!.createBot(data)
        Log.new({ company_id: data.company_id, user_id: request.user!.id, text: `criou o chatbot ${bot.name}`, type: "chatbot" })

        response.json(bot)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/active-on", async (request: CompanyRequest, response: Response) => {
    const chat_id = request.query.chat_id as string | undefined

    if (chat_id) {
        try {
            const bots = await request.company!.getBots()
            const activeBot = bots.find((bot) => bot.active_on.find((active_chat) => active_chat.chat_id === chat_id))
            const paused = bots.find((bot) => bot.paused_chats.get(chat_id))
            setTimeout(() => console.log({ activeBot, paused }), 2000)
            return response.json({ activeBot, paused })
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("chat_id param is required")
    }
})

router.use(requireBotId) // requiring bot ID

router.get("/toggle", async (request: BotRequest, response: Response) => {
    const chat_id = request.query.chat_id as string | undefined
    console.log("aaaaaaaaaaaaaaaaa")

    if (chat_id) {
        try {
            const bot = request.bot!
            if (bot.isPaused(chat_id)) {
                bot.unpauseChat(chat_id)
            } else {
                bot.pauseChat(chat_id, 1000 * 60 * 60 * 24) // 1 day
            }

            return response.json({ activeBot: null, paused: bot.isPaused(chat_id) ? bot : null })
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("chat_id param is required")
    }
})

router.get("/channels", async (request: BotRequest & UserRequest, response: Response) => {
    try {
        const channels = await request.bot!.getChannels()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/", async (request: BotRequest & UserRequest, response: Response) => {
    const data = request.body as Partial<Bot>

    try {
        const bot = request.bot!
        await bot.update(data)
        Log.new({ company_id: bot.company_id, user_id: request.user!.id, type: "chatbot", text: `editou o chatbot ${bot.name}` })
        response.json(request.bot)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: BotRequest & UserRequest, response: Response) => {
    try {
        const bot = request.bot!
        await bot.delete()
        Log.new({ company_id: bot.company_id, user_id: request.user!.id, type: "chatbot", text: `deletou o chatbot ${bot.name}` })
        response.status(201).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
