import express, { Express, Request, Response } from 'express'
import { requireUserId, UserRequest } from '../../middlewares/requireUserId'
import { AdminCompany, Company } from '../../class/Company'

const router = express.Router()
router.use(requireUserId)

router.get('/companies', async (request:UserRequest, response:Response) => {    
        try {
            const companies = await AdminCompany.getAll()
            response.json(companies)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }

})

export default router