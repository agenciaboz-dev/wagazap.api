import express, { Express, Request, Response } from 'express'
const router = express.Router()

router.post('/', async (request:Request, response:Response) => {    
    const data = request.body as {}

    try {
        console.log(data)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }

})

export default router