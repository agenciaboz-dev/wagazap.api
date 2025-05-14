import { NextFunction, Request, Response } from "express"
import { Washima } from "../class/Washima/Washima"

export interface WashimaRequest extends Request {
    washima?: Washima
}

export const requireWashimaId = async (request: WashimaRequest, response: Response, next: NextFunction) => {
    const { washima_id } = request.query

    if (!washima_id) {
        return response.status(400).send("washima_id param is required")
    }

    request.washima =
        Washima.find(washima_id as string) ||
        Washima.waitingList.find((washima) => washima.id === washima_id) ||
        Washima.initializing.get(washima_id as string)

    if (!request.washima) {
        return response.status(404).send("washima not found")
    }

    next()
}
