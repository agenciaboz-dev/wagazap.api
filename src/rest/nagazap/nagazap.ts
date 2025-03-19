import express, { Express, Request, Response } from "express"
import { OvenForm, WhatsappApiForm, WhatsappForm, WhatsappTemplateComponent } from "../../types/shared/Meta/WhatsappBusiness/WhatsappForm"
import { addMessageToStack, api as zapApi } from "../../api/whatsapp/meta"
import { AxiosError } from "axios"
import { MessageWebhook } from "../../types/shared/Meta/WhatsappBusiness/MessageWebhook"
import { Nagazap, NagazapForm } from "../../class/Nagazap"
import { UploadedFile } from "express-fileupload"
import { saveFile } from "../../tools/saveFile"
import { HandledError } from "../../class/HandledError"
import { NagazapRequest, requireNagazapId } from "../../middlewares/requireNagazapId"
import webhook from "./webhook"
import { TemplateForm } from "../../types/shared/Meta/WhatsappBusiness/TemplatesInfo"
import stats from "./stats"
import links from "./links"
import { existsSync } from "fs"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { Log } from "../../class/Log"

const router = express.Router()

export const getNumbers = (original_number: string | number) => {
    const number = `55${original_number}@c.us`

    const prefix = number.slice(2, 4)
    const number2 = `55${prefix + number.slice(5)}`
    return [number, number2]
}

router.use("/webhook", webhook)
router.use("/stats", stats)
router.use("/links", links)

router.get("/sync-templates", async (request: Request, response: Response) => {
    try {
        const nagazaps = await Nagazap.getAll()
        for (const nagazap of nagazaps) {
            await nagazap.syncTemplates()
        }
        response.json(nagazaps)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/", async (request: Request, response: Response) => {
    const company_id = request.query.company_id as string | undefined
    const nagazap_id = request.query.nagazap_id as string | undefined

    console.log(company_id)
    if (company_id) {
        if (nagazap_id) {
            const nagazap = await Nagazap.getById(nagazap_id)
            response.json(nagazap)
        } else {
            try {
                const nagazaps = await Nagazap.getByCompanyId(company_id)
                response.json(nagazaps)
            } catch (error) {
                console.log(error)
                response.status(500).send(error)
            }
        }
    } else {
        response.status(400).send("company_id param is required")
    }
})

router.get("/info", async (request: Request, response: Response) => {
    const nagazap_id = request.query.nagazap_id as string
    try {
        const nagazap = await Nagazap.getById(nagazap_id)
        const info = await nagazap.getInfo()
        if (info) {
            return response.json(info)
        } else {
            response.status(400).send("Não foi possível obter as informações, verifique seu Token")
        }
    } catch (error) {
        response.status(500).send(error)
        if (error instanceof AxiosError) {
            console.log(error.response?.data)
        } else {
            console.log(error)
        }
    }
})

router.use(requireUserId)

router.post("/", async (request: UserRequest, response: Response) => {
    const data = request.body as NagazapForm

    try {
        const nagazap = await Nagazap.new(data)
        Log.new({
            company_id: data.companyId,
            user_id: request.user!.id,
            text: `cadastrou a conta ${nagazap.displayName} - ${nagazap.displayPhone} no Broadcast`,
            type: "nagazap",
        })
        response.json(nagazap)
    } catch (error) {
        console.log(error)
        response.status(error instanceof HandledError ? 400 : 500).send(error)
    }
})

router.use(requireNagazapId) // require the "nagazap_id" param for all routes bellow

router.patch("/", async (request: NagazapRequest & UserRequest, response: Response) => {
    const data = request.body as { batchSize?: number; frequency?: string }

    try {
        await request.nagazap!.updateOvenSettings(data)
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `editou configurações de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(request.nagazap)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const deleted = await Nagazap.delete(request.nagazap!.id)
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `deletou ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(deleted)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/pause", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        await nagazap.pause()
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `pausou o forno da conta ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(nagazap)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/start", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        await nagazap.start()
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `ligou o forno da conta ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(nagazap)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/clearOven", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        await nagazap.clearOven()
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `limpou o forno da conta ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(nagazap)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/blacklist", async (request: NagazapRequest & UserRequest, response: Response) => {
    const data = request.body as { number: string }

    try {
        const nagazap = request.nagazap!
        await nagazap.removeFromBlacklist(data.number)
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `removeu o número ${data.number} da lista negra de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json(nagazap)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/token", async (request: NagazapRequest & UserRequest, response: Response) => {
    const data = request.body as { token: string }
    if (data.token) {
        try {
            const nagazap = request.nagazap!
            await nagazap.updateToken(data.token)
            Log.new({
                company_id: request.nagazap!.companyId,
                user_id: request.user!.id,
                text: `alterou o Token de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
                type: 'nagazap',
            })
            response.json(nagazap)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("missing token attribute")
    }
})

router.get("/messages", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        const messages = await nagazap.getMessages()
        response.json(messages)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/templates", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        const templates = await nagazap.getTemplates()
        response.json(templates)
    } catch (error) {
        response.status(500).send(error)
        if (error instanceof AxiosError) {
            console.log(error.response?.data)
        } else {
            console.log(error)
        }
    }
})

router.post("/template", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const data = JSON.parse(request.body.data) as TemplateForm
        console.log(JSON.stringify(data, null, 4))

        const nagazap = request.nagazap!

        if (request.files) {
            const file = request.files.file as UploadedFile
            file.name = file.name.replace(/[\s\/\\?%*:|"<>]+/g, "-").trim()
            const media_handler = await nagazap.uploadTemplateMedia(file)
            data.components.forEach((component, index) => {
                if (component.type === "HEADER") {
                    data.components[index].example = { header_handle: [media_handler.h] }
                }
            })
        }

        const template_response = await nagazap.createTemplate(data)
        const csv_model = await nagazap.exportTemplateModel(data, "csv")
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `criou um Template em ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json({ template_response, csv_model })
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 400) {
            console.log(error.response.data)
            return response
                .status(400)
                .send(
                    error.response.data.error.error_user_title && error.response.data.error.error_user_msg
                        ? `${error.response.data.error.error_user_title}. ${error.response.data.error.error_user_msg}`
                        : error.response.data.error.message
                )
        }
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/template", async (request: NagazapRequest & UserRequest, response: Response) => {
    const { template_id } = request.query

    if (!template_id) return response.status(400).send("template_id param is required")

    try {
        const data = JSON.parse(request.body.data) as Partial<TemplateForm>
        console.log(JSON.stringify(data, null, 4))

        const nagazap = request.nagazap!

        if (request.files && data.components) {
            const file = request.files.file as UploadedFile
            file.name = file.name.replace(/[\s\/\\?%*:|"<>]+/g, "-").trim()
            const media_handler = await nagazap.uploadTemplateMedia(file)
            data.components.forEach((component, index) => {
                if (component.type === "HEADER") {
                    data.components![index].example = { header_handle: [media_handler.h] }
                }
            })
        }

        const dto: Partial<TemplateForm> = {}
        dto.components = data.components
        dto.category = data.category

        const template_response = await nagazap.updateTemplate(template_id as string, dto)
        const csv_model = await nagazap.exportTemplateModel(template_response.info, "csv")
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `Alterou um Template em ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.json({ template_response, csv_model })
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 400) {
            console.log(error.response.data)
            return response
                .status(400)
                .send(
                    error.response.data.error.error_user_title && error.response.data.error.error_user_msg
                        ? `${error.response.data.error.error_user_title}. ${error.response.data.error.error_user_msg}`
                        : error.response.data.error.message
                )
        }
        console.log(error)
        response.status(500).send(error)
    }
})

router.post("/template-sheet", async (request: NagazapRequest & UserRequest, response: Response) => {
    const nagazap_id = request.query.nagazap_id as string | undefined
    const template = request.body as TemplateForm
    const { file_type } = request.query

    if (nagazap_id) {
        try {
            const nagazap = request.nagazap!
            const path = nagazap.getTemplateSheet(template.name, file_type as string)
            console.log(path)

            if (!existsSync(path)) {
                console.log("sheet not found, generating a new one")
                await nagazap.exportTemplateModel(template, file_type as string)
            }

            response.json(path)
        } catch (error) {
            console.log(error)
            response.status(500).send(error)
        }
    } else {
        response.status(400).send("nagazap_id param is required")
    }
})

router.post("/oven", async (request: NagazapRequest & UserRequest, response: Response) => {
    const { send_now } = request.query

    try {
        const nagazap = request.nagazap!
        let image_id = ""

        const data: OvenForm = request.headers["content-type"]?.split(";")[0] === "multipart/form-data" ? JSON.parse(request.body.data) : request.body
        console.log(`quantidade de contatos: ${data.to.length}`)
        if (!data.template_id) {
            response.status(400).send("template is required")
            return
        }

        if (request.files) {
            const file = request.files.file as UploadedFile
            file.name = file.name.replace(/[\s\/\\?%*:|"<>]+/g, "-").trim()
            const uploaded = saveFile("nagazap/image", { name: file.name, file: file.data }, async () => {
                image_id = await nagazap.uploadMedia(file, uploaded.filepath)
                await nagazap.prepareBatch(data, image_id)
                if (send_now) await nagazap.start()
            })
        } else {
            await nagazap.prepareBatch(data, image_id)
            if (send_now) await nagazap.start()
        }

        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `adicionou ${data.to.length} números no forno de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })

        response.status(201).send()
    } catch (error) {
        console.log(error)
        if (error instanceof AxiosError) {
            console.log(error.response?.data)
        }
        response.status(500).send(error)
    }
})

router.post("/sync-templates", async (request: NagazapRequest & UserRequest, response: Response) => {
    try {
        const nagazap = request.nagazap!
        await nagazap.syncTemplates()
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `sincronizou os templates de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.status(201).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/template", async (request: NagazapRequest & UserRequest, response: Response) => {
    const { template_id } = request.query

    if (!template_id) return response.status(400).send("template_id param is required")

    try {
        const nagazap = request.nagazap!
        const template = await nagazap.deleteTemplate(template_id as string)
        Log.new({
            company_id: request.nagazap!.companyId,
            user_id: request.user!.id,
            text: `deletou o template ${template.info.name} de ${request.nagazap!.displayName} - ${request.nagazap!.displayPhone} no Broadcast`,
            type: 'nagazap',
        })
        response.status(201).send()
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

// // router.post("/", async (request: Request, response: Response) => {
// //     const data = request.body as WhatsappForm

// //     try {
// //         const new_message_index = addMessageToStack(data)
// //         console.log({ queued_message_number: data.number, template: data.template, new_message_index })
// //         response.json(new_message_index)
// //     } catch (error) {
// //         if (error instanceof AxiosError) {
// //             console.log(error.response?.data)
// //         } else {
// //             console.log(error)
// //         }
// //         response.status(500).send(error)
// //     }
// // })

export default router
