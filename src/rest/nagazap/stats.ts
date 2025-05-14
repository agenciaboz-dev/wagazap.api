import express, { Express, Request, Response } from "express"
import { requireUserId } from "../../middlewares/requireUserId"
import { User } from "../../class/User"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
const router = express.Router()

router.use(requireCompanyId)

router.get("/count", async (request: CompanyRequest, response: Response) => {
    try {
        const count = await request.company?.getNagazapsCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/templates", async (request: CompanyRequest, response: Response) => {
    try {
        const count = await request.company?.getNagazapsTemplatesCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/messages", async (request: CompanyRequest, response: Response) => {
    try {
        const count = await request.company?.getNagazapsLogsCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/oven", async (request: CompanyRequest, response: Response) => {
    try {
        const count = await request.company?.getBakingMessagesCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/blacklist", async (request: CompanyRequest, response: Response) => {
    try {
        const count = await request.company?.getBlacklistedCount()
        response.json(count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
