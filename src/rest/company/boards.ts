import express, { Express, Request, Response } from "express"
import { requireUserId, UserRequest } from "../../middlewares/requireUserId"
import { CompanyRequest, requireCompanyId } from "../../middlewares/requireCompanyId"
import { Board, BoardAccess, BoardForm, TransferChatForm } from "../../class/Board/Board"
import { Log } from "../../class/Log"
import { BoardRequest, requireBoardId } from "../../middlewares/requireBoardId"
import { Room } from "../../class/Board/Room"

const router = express.Router()

router.use(requireUserId)
router.use(requireCompanyId)

type UserCompanyRequest = UserRequest & CompanyRequest
type BoardAuthRequest = BoardRequest & UserCompanyRequest

router.get("/", async (request: UserCompanyRequest, response: Response) => {
    const { board_id, all } = request.query

    try {
        if (board_id) {
        } else {
            const boards = all ? await Board.getCompanyBoards(request.company!.id) : await request.user!.getBoards()
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
        Log.new({ company_id: request.company!.id, text: `criou o quadro ${board.name}`, user_id: request.user!.id, type: "boards" })
        return response.json(board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.use(requireBoardId)

router.patch("/", async (request: BoardAuthRequest, response: Response) => {
    const data = request.body as Partial<Board> & { access?: BoardAccess }

    try {
        if (data.washima_settings) {
            await request.board!.handleWashimaSettingsChange(data.washima_settings)
        }

        if (data.nagazap_settings) {
            await request.board!.handleNagazapSettingsChange(data.nagazap_settings)
        }

        if (data.access) {
            await request.board!.changeAccess(data.access)
        }

        await request.board!.update(data)
        response.json(request.board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.delete("/", async (request: BoardAuthRequest, response: Response) => {
    try {
        await request.board!.delete()
        Log.new({ company_id: request.company!.id, text: `deletou o quadro ${request.board!.name}`, user_id: request.user!.id, type: "boards" })
        return response.json(request.board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.get("/access", async (request: BoardAuthRequest, response: Response) => {
    try {
        const access = await request.board!.getAccess()
        return response.json(access)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.post("/transfer", async (request: BoardAuthRequest, response: Response) => {
    const data = request.body as TransferChatForm

    try {
        await request.board?.transferChat(data)
        return response.json(request.board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

router.patch("/room", async (request: BoardAuthRequest, response: Response) => {
    const { room_id } = request.query
    const data = request.body as Partial<Room>

    try {
        console.log(room_id, request.board)
        const room = request.board!.getRoom(room_id as string)
        room.on_new_chat = data.on_new_chat
        request.board!.updateRoom(room)
        return response.json(request.board)
    } catch (error) {
        console.log(error)
        response.status(500).send(error)
    }
})

export default router
