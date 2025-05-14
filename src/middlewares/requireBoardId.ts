import { NextFunction, Response } from "express"
import { CompanyRequest } from "./requireCompanyId"
import { Board } from "../class/Board/Board"

export interface BoardRequest extends CompanyRequest {
    board?: Board
}

export const requireBoardId = async (request: BoardRequest, response: Response, next: NextFunction) => {
    const { board_id } = request.query

    if (!board_id) {
        return response.status(400).send("Bot_id param is required")
    }

    request.board = await Board.find(board_id as string)

    next()
}
