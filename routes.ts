import express, { Express, Request, Response } from "express"
import nagazap from "./src/rest/nagazap"
import washima from "./src/rest/washima/washima"

export const router = express.Router()

router.use("/nagazap", nagazap)
router.use("/washima", washima)
