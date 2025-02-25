import { NextFunction, Request, Response } from "express"
import { User } from "../class/User"

export interface UserRequest extends Request {
    user?: User | null
}

export const requireUserId = async (request: UserRequest, response: Response, next: NextFunction) => {
    const {  user_id } = request.query

    if (!user_id) {
        return response.status(400).send("User_id param is required")
    }

    request.user = await User.findById(user_id as string)

    next()
}
