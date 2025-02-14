import express, { Express, Request, Response } from "express"
import { Company, CompanyForm } from "../../class/Company"
import stats from "./stats"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import bots from "./bots"

const router = express.Router()

router.use("/stats", stats)
router.use("/bots", bots)

router.post("/", async (request: Request, response: Response) => {
    const data = request.body as CompanyForm

    try {
        const result = await Company.signup(data)
        response.json(result)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireCompanyId)

router.get("/users", async (request: CompanyRequest, response: Response) => {
    try {
        const users = await request.company?.getUsers()
        response.json(users)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
