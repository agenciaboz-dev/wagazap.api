import express, { Express, Request, Response } from "express"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"

const router = express.Router()

router.use(requireCompanyId)

router.get("/washima", async (request: CompanyRequest, response: Response) => {
    try {
        const washimas = request.company!.getWashimas()
        const connected = washimas.filter((washima) => washima.ready).length
        const pending = (await request.company!.getWashimasCount()) - connected
        response.json({ connected, pending })
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/unreplied", async (request: CompanyRequest, response: Response) => {
    try {
        const unreplied_count = await request.company?.getUnrepliedCount()
        response.json(unreplied_count)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/storage", async (request: CompanyRequest, response: Response) => {
    try {
        const total_disk = await request.company?.getTotalStorage()
        console.log(total_disk)
        response.json(total_disk)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
