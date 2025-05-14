import express, { Express, Request, Response } from "express"
import { version } from "./src/version"
import signup from "./src/rest/signup"

export const router = express.Router()

router.get("/", (request, response) => {
    response.json({ version })
})

router.use("/signup", signup)
