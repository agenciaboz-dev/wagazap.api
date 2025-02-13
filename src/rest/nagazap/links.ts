import express, { Express, Request, Response } from "express"
import { NagazapRequest, requireNagazapId } from "../../middlewares/requireNagazapId"
import { NagazapLink } from "../../class/NagazapLink"
import { getLocalUrl } from "../../tools/getLocalUrl"

const router = express.Router()

router.get("/:hash", async (request: Request, response: Response) => {
    const hash = request.params.hash

    try {
        const url = `${getLocalUrl()}/nagazap/links/${hash}`
        console.log(url)
        const link = await NagazapLink.findLink(url)
        link.click()
        response.redirect(link.original_url)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireNagazapId)

router.get("/", async (request: NagazapRequest, response: Response) => {
    try {
        const links = await request.nagazap!.getLinks()
        response.json(links)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
