import express, { Express, Request, Response } from "express"
import { User } from "../../class/User"
import { requireUserId } from "../../middlewares/requireUserId"
import { Washima } from "../../class/Washima/Washima"

const router = express.Router()

router.use(requireUserId)

router.get("/washima", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string

    try {
        const user = await User.findById(user_id)
        if (user) {
            const washimas = user.admin ? Washima.washimas : user.getWashimas()
            const connected = washimas.filter((washima) => washima.ready).length
            const pending = (await user.getWashimasCount()) - connected
            response.json({ connected, pending })
        } else {
            response.status(404).send("user not found")
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/unreplied", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string

    try {
        const user = await User.findById(user_id)
        if (user) {
            const unreplied_count = user?.admin
                ? (await Promise.all((await User.getAll()).map(async (user) => await user.getUnrepliedCount()))).reduce(
                      (total, count) => total + count
                  )
                : await user.getUnrepliedCount()
            response.json(unreplied_count)
        } else {
            response.status(404).send("user not found")
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/storage", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string

    try {
        const user = await User.findById(user_id)
        if (user) {
            const total_disk = user?.admin
                ? (await Promise.all((await User.getAll()).map(async (user) => await user.getTotalStorage()))).reduce((total, count) => total + count)
                : await user.getTotalStorage()
            response.json(total_disk)
        } else {
            response.status(404).send("user not found")
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
