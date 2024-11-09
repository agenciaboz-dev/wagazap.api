import express, { Express, Request, Response } from "express"
import { MessageWebhook } from "../../types/shared/Meta/WhatsappBusiness/MessageWebhook"
import { Nagazap } from "../../class/Nagazap"
const router = express.Router()

router.get("/messages", async (request: Request, response: Response) => {
    const mode = request.query["hub.mode"]

    if (mode == "subscribe") {
        try {
            const challenge = request.query["hub.challenge"]

            response.status(200).send(challenge)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("hub.mode should be subscribe")
    }
})

router.post("/messages", async (request: Request, response: Response) => {
    try {
        const data = request.body as MessageWebhook
        console.log(data)
        const businessId = data.entry[0].id
        const nagazap = await Nagazap.getByBusinessId(businessId)
        data.entry?.forEach(async (entry) => {
            entry.changes?.forEach(async (change) => {
                if (change.field !== "messages") return
                change.value.messages?.forEach(async (message) => {
                    console.log(message)
                    nagazap.saveMessage({
                        from: message.from.slice(2),
                        text: message.text?.body || message.button?.text || "**MENSAGEM DE MIDIA**",
                        timestamp: message.timestamp,
                        name: change.value.contacts[0].profile?.name || "",
                    })
                })
            })
        })
        response.status(200).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/media", async (request: Request, response: Response) => {
    const mode = request.query["hub.mode"]

    if (mode == "subscribe") {
        try {
            const challenge = request.query["hub.challenge"]

            response.status(200).send(challenge)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("hub.mode should be subscribe")
    }
})

router.post("/media", async (request: Request, response: Response) => {
    const data = request.body

    try {
        console.log(JSON.stringify(data, null, 4))
        response.status(200).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
