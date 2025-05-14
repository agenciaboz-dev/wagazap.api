import express, { Express, Request, Response } from "express"
import { User, UserForm } from "../../class/User"
import login from "./login"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { Log } from "../../class/Log"

const router = express.Router()

router.use("/login", login)

router.use(requireUserId)

router.post("/", async (request: UserRequest, response: Response) => {
    const data = request.body as UserForm

    try {
        const user = await User.new(data)
        console.log(user)
        Log.new({ company_id: data.company_id, user_id: request.user!.id, type: "users", text: `cadastrou o usuário ${user.name}` })
        response.json(user)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/", async (request: UserRequest, response: Response) => {
    const data = request.body as Partial<User>

    if (data.id) {
        try {
            const user = await User.findById(data.id)
            if (user) {
                Log.new({ company_id: user.company_id, user_id: request.user!.id, type: "users", text: `editou o usuário ${user.name}` })
            }
            await user?.update(data)
            response.json(user)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("id attribute is required in the payload.")
    }
})

router.delete("/", async (request: UserRequest, response: Response) => {
    const { deleted_user_id } = request.query

    if (deleted_user_id) {
        try {
            const user = await User.delete(deleted_user_id as string)
            Log.new({ company_id: user.company_id, user_id: request.user!.id, type: 'users', text: `deletou o usuário ${user.name}` })
            response.json(user)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("user_id param is required")
    }
})


export default router
