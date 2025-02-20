import express, { Express, Request, Response } from "express"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import { Bot, BotForm } from "../../class/Bot/Bot"
import { BotRequest, requireBotId } from "../../middlewares/requireBotId"

const router = express.Router()
router.use(requireCompanyId)

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

router.post("/", async (request: CompanyRequest, response: Response) => {
    const data = request.body as BotForm

    try {
        const bot = await request.company!.createBot(data)
        response.json(bot)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireBotId)

router.get("/channels", async (request: BotRequest, response: Response) => {
    try {
        const channels = await request.bot!.getChannels()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/", async (request: BotRequest, response: Response) => {
    const data = request.body as Partial<Bot>
    console.log(data)

    try {
        await request.bot!.update(data)
        response.json(request.bot)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: BotRequest, response: Response) => {
    try {
        await request.bot!.delete()
        response.status(201).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
