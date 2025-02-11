import express, { Express, Request, Response } from "express"
import { Company, CompanyForm } from "../../class/Company"
import stats from "./stats"

const router = express.Router()

router.use("/stats", stats)

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

export default router
