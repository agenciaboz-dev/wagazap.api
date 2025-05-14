import { NextFunction, Response } from "express"
import { Bot } from "../class/Bot/Bot"
import { CompanyRequest } from "./requireCompanyId"

export interface BotRequest extends CompanyRequest {
    bot?: Bot
}

export const requireBotId = async (request: BotRequest, response: Response, next: NextFunction) => {
    const { bot_id } = request.query

    if (!bot_id) {
        return response.status(400).send("Bot_id param is required")
    }

    request.bot = await Bot.getById(bot_id as string)

    next()
}
