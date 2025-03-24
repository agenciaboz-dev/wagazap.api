import express, { Express, Request, Response } from "express"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import { Board, BoardForm } from "../../class/Board/Board"
import { Log } from "../../class/Log"

const router = express.Router()

router.use(requireUserId)
router.use(requireCompanyId)

type UserCompanyRequest = UserRequest & CompanyRequest

router.get("/", async (request: UserCompanyRequest, response: Response) => {
    const { board_id } = request.query

    try {
        if (board_id) {
        } else {
            const boards = await request.user!.getBoards()
            return response.json(boards)
        }
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.post("/", async (request: UserCompanyRequest, response: Response) => {
    const data = request.body as BoardForm

    try {
        const board = await Board.new(data, request.company!.id)
        Log.new({ company_id: request.company!.id, text: `criou o quadro ${board.name}`, user_id: request.user!.id, type: "default" })
        return response.json(board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: UserCompanyRequest, response: Response) => {
    const { board_id } = request.query

    try {
        const board = await Board.find(board_id as string)
        await board.delete()
        Log.new({ company_id: request.company!.id, text: `deletou o quadro ${board.name}`, user_id: request.user!.id, type: "default" })
        return response.json(board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
