import express, { Express, Request, Response } from "express"
import { Company, CompanyForm } from "../../class/Company"
import stats from "./stats"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import bots from "./bots"
import departments from "./departments"
import boards from "./boards"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { Log } from "../../class/Log"

const router = express.Router()

router.use("/stats", stats)
router.use("/bots", bots)
router.use("/departments", departments)
router.use("/boards", boards)

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

router.get("/logs", async (request: CompanyRequest, response: Response) => {
    try {
        const logs = await request.company?.getLogs()
        response.json(logs)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireUserId)

router.patch("/", async (request: CompanyRequest & UserRequest, response: Response) => {
    const data = request.body as Partial<Company>

    try {
        await request.company!.update(data)
        // Log.new({company_id: request.company!.id, user_id: request.user!.id, type: ''})
        response.json(request.company)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
