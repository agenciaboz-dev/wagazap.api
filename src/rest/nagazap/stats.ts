import express, { Express, Request, Response } from "express"
import { requireUserId } from "../../middlewares/requireUserId"
import { User } from "../../class/User"
const router = express.Router()

router.use(requireUserId)

router.get("/count", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string
    try {
        const user = await User.findById(user_id)
        const count = user?.admin
            ? (await Promise.all((await User.getAll()).map(async (user) => await user.getNagazapsCount()))).reduce((total, count) => total + count)
            : await user?.getNagazapsCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/templates", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string
    try {
        const user = await User.findById(user_id)
        const count = user?.admin
            ? (await Promise.all((await User.getAll()).map(async (user) => await user.getNagazapsTemplatesCount()))).reduce(
                  (total, count) => total + count
              )
            : await user?.getNagazapsTemplatesCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/messages", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string
    try {
        const user = await User.findById(user_id)
        const count = user?.admin
            ? (await Promise.all((await User.getAll()).map(async (user) => await user.getNagazapsLogsCount()))).reduce((total, current) => ({
                  success: total.success + current.success,
                  error: total.error + current.error,
              }))
            : await user?.getNagazapsLogsCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/oven", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string
    try {
        const user = await User.findById(user_id)
        const count = user?.admin
            ? (await Promise.all((await User.getAll()).map(async (user) => await user.getBakingMessagesCount()))).reduce(
                  (total, count) => total + count
              )
            : await user?.getBakingMessagesCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/blacklist", async (request: Request, response: Response) => {
    const user_id = request.query.user_id as string
    try {
        const user = await User.findById(user_id)
        const count = user?.admin
            ? (await Promise.all((await User.getAll()).map(async (user) => await user.getBlacklistedCount()))).reduce((total, count) => total + count)
            : await user?.getBlacklistedCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
