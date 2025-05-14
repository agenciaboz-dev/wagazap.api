import express, { Express, Request, Response } from "express"
import { LoginForm } from "../../types/shared/LoginForm"
import { User } from "../../class/User"
import { Company } from "../../class/Company"
const router = express.Router()

router.post("/", async (request: Request, response: Response) => {
    const data = request.body as LoginForm

    try {
        const user = await User.login(data)

        if (!user) {
            response.json(null)
        } else {
            const company = await Company.getById(user.company_id)
            response.json({ user, company })
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
