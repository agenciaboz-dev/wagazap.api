import { NextFunction, Request, Response } from "express"
import { Nagazap } from "../class/Nagazap"

export interface NagazapRequest extends Request {
    nagazap?: Nagazap
}

export const requireNagazapId = async (request: NagazapRequest, response: Response, next: NextFunction) => {
    const { nagazap_id } = request.query

    if (!nagazap_id) {
        return response.status(400).send("nagazap_id param is required")
    }

    request.nagazap = await Nagazap.getById(nagazap_id as string)

    next()
}
