import express, { Express, Request, Response } from "express"
import { User, UserForm } from "../../class/User"
import login from "./login"

const router = express.Router()

router.use("/login", login)

router.post("/", async (request: Request, response: Response) => {
    const data = request.body as UserForm

    try {
        const user = await User.new(data)
        console.log(user)
        response.json(user)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
