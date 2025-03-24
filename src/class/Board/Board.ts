import { Prisma } from "@prisma/client"
import { Room, RoomDto, RoomForm } from "./Room"
import { prisma } from "../../prisma"
import { WithoutFunctions } from "../helpers"
import { Department } from "../Department"
import { User } from "../User"
import { uid } from "uid"
import { Chat, ChatDto } from "./Chat"
import WAWebJS from "whatsapp-web.js"
import { Washima } from "../Washima/Washima"
import { WashimaMessage } from "../Washima/WashimaMessage"
import { Socket } from "socket.io"

export type BoardPrisma = Prisma.BoardGetPayload<{}>
export interface BoardForm {
    name: string
}

export interface BoardWashimaSettings {
    washima_id: string
    room_id?: string
}

export interface HandleWashimaMessageDto {
    company_id: string
    chat: WAWebJS.Chat
    washima: Washima
    message: WashimaMessage
}

export class Board {
    id: string
    name: string
    created_at: string
    rooms: Room[]
    entry_room_id: string
    company_id: string
    receive_washima_message: BoardWashimaSettings[]

    // static async getChatByWashimaChatId(washima_chat_id: string, company_id: string) {
    //     const boards = await this.getCompanyBoards(company_id)
    //     for (const board of boards) {
    //         if (board.rooms)
    //     }
    // }

    static handleSocket(socket: Socket) {
        socket.on("board:subscribe", (board_id: string) => socket.join(board_id))
        socket.on("board:unsubscribe", (board_id: string) => socket.leave(board_id))
        socket.on("board:update", async (boardDto: Board) => {
            console.log("board being updated")
            const board = await Board.find(boardDto.id)
            console.log({ boardDto })
            board.update(boardDto)
            socket.to(boardDto.id).emit("board:update", boardDto)
        })
    }

    static async handleWashimaNewMessage(data: HandleWashimaMessageDto) {
        const boards = await this.getCompanyBoards(data.company_id)
        const contact = await data.chat.getContact()
        const profilePic = await data.washima.getCachedProfilePicture(data.chat.id._serialized, "chat")
        const chat: ChatDto = {
            id: uid(),
            name: data.chat.name,
            phone: contact.number,
            washima_chat_id: data.chat.id._serialized,
            washima_id: data.washima.id,
            is_group: data.chat.isGroup,
            profile_pic: profilePic?.url,
            last_message: data.message,
            unread_count: data.chat.unreadCount,
        }
        for (const board of boards) {
            await board.handleWashimaMessage(chat)
        }
    }

    static async getCompanyBoards(company_id: string) {
        const result = await prisma.board.findMany({ where: { company_id } })
        const boards = result.map((item) => new Board(item))
        return boards
    }

    static async find(board_id: string) {
        const result = await prisma.board.findUnique({ where: { id: board_id } })
        if (!result) throw "quadro não encontrado"

        return new Board(result)
    }

    static async new(data: BoardForm, company_id: string) {
        const messages = (await prisma.washimaMessage.findMany({ take: 4 })).map((item) => new WashimaMessage(item))
        const chats = [1, 2, 3, 4].map(
            (index) =>
                new Chat({
                    id: uid(),
                    name: `conversa ${index}`,
                    phone: `numero ${index}`,
                    unread_count: 1,
                    washima_chat_id: uid(),
                    washima_id: "nenhum",
                    last_message: messages[index - 1],
                })
        )
        const initialRoom = new Room({ id: uid(), name: "Sala 1", chats: chats, entry_point: true })
        const result = await prisma.board.create({
            data: {
                created_at: new Date().getTime().toString(),
                name: data.name,
                entry_room_id: initialRoom.id,
                rooms: JSON.stringify([initialRoom]),
                company_id,
                receive_washima_message: JSON.stringify([]),
            },
        })

        const board = new Board(result)
        return board
    }

    constructor(data: BoardPrisma) {
        this.id = data.id
        this.company_id = data.company_id
        this.name = data.name
        this.created_at = data.created_at
        this.rooms = JSON.parse(data.rooms as string).map((room: RoomDto) => new Room(room))
        this.entry_room_id = data.entry_room_id
        this.receive_washima_message = JSON.parse(data.receive_washima_message as string)
    }

    load(data: BoardPrisma) {
        this.id = data.id
        this.company_id = data.company_id
        this.name = data.name
        this.created_at = data.created_at
        this.rooms = JSON.parse(data.rooms as string).map((room: RoomDto) => new Room(room))
        this.entry_room_id = data.entry_room_id
        this.receive_washima_message = JSON.parse(data.receive_washima_message as string)
    }

    async update(data: Partial<WithoutFunctions<Board & { departments?: Department[]; users?: User[] }>>) {
        const result = await prisma.board.update({
            where: { id: this.id },
            data: {
                name: data.name,
                entry_room_id: data.entry_room_id,
                rooms: data.rooms ? JSON.stringify(data.rooms) : undefined,
                departments: data.departments ? { set: [], connect: data.departments.map((item) => ({ id: item.id })) } : undefined,
                users: data.users ? { set: [], connect: data.users.map((item) => ({ id: item.id })) } : undefined,
            },
        })
        this.load(result)
    }

    async delete() {
        const result = await prisma.board.delete({ where: { id: this.id } })
        return result
    }

    async saveRooms() {
        await this.update({ rooms: this.rooms })
    }

    newRoom(data: RoomForm) {
        const room = new Room({ id: uid(), chats: [], name: data.name })
        this.rooms.push(room)
        this.saveRooms()
    }

    deleteRoom(room_id: string) {
        this.rooms = this.rooms.filter((room) => room.id !== room_id)
        this.saveRooms()
    }

    updateRoom(updatedRoom: Room) {
        const index = this.rooms.findIndex((room) => room.id === updatedRoom.id)
        this.rooms[index] = updatedRoom
        this.saveRooms()
    }

    async newChat(chat: Chat, room_id?: string) {
        const room = this.rooms.find((room) => (room_id || this.entry_room_id) === room.id)
        if (!room) throw "sala não encontrada nesse quadro"

        room.chats.unshift(chat)
        this.saveRooms()
        if (room.on_new_chat) {
            const targetBoard = await Board.find(room.on_new_chat.board_id)
            await targetBoard.newChat(chat, room.on_new_chat.room_id)
        }
    }

    async handleWashimaMessage(chatDto: ChatDto) {
        const washima_setting = this.receive_washima_message.find((item) => item.washima_id === chatDto.washima_id)
        if (!washima_setting) return false

        let chat = new Chat(chatDto)
        const roomWithChat = this.rooms.find((room) =>
            room.chats.find((item) => {
                if (item.washima_chat_id === chatDto.washima_chat_id) {
                    chat = item
                    chat.unread_count = chatDto.unread_count
                    chat.profile_pic = chatDto.profile_pic
                    chat.last_message = chatDto.last_message
                    return true
                }
                return false
            })
        )

        if (roomWithChat) {
            await roomWithChat.newMessage(chat)
        } else {
            this.newChat(chat)
        }
    }
}
