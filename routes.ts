import express, { Express, Request, Response } from "express"
import nagazap from "./src/rest/nagazap"
import washima from "./src/rest/washima/washima"
import user from "./src/rest/user/user"

export const router = express.Router()

router.use("/nagazap", nagazap)
router.use("/washima", washima)
router.use("/user", user)
