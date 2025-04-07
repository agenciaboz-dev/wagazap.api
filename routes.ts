import express, { Express, Request, Response } from "express"
import nagazap from "./src/rest/nagazap/nagazap"
import washima from "./src/rest/washima/washima"
import user from "./src/rest/user/user"
import company from "./src/rest/company/company"
import admin from "./src/rest/admin/admin"
import { version } from "./src/version"

export const router = express.Router()

router.get("/", (request, response) => {
    response.json({ version })
})

router.use("/nagazap", nagazap)
router.use("/washima", washima)
router.use("/user", user)
router.use("/company", company)
router.use("/admin", admin)
