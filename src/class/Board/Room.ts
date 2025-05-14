import { WithoutFunctions } from "../helpers"
import { Chat } from "./Chat"
import { getIoInstance } from "../../io/socket"


export type RoomDto = WithoutFunctions<Room>
export interface RoomForm {
    name: string
}

export interface RoomTrigger {
    board_id: string
    board_name: string
    room_id?: string
}

export class Room {
    id: string
    name: string
    chats: Chat[]

    entry_point?: boolean
    on_new_chat?: RoomTrigger

    constructor(data: RoomDto) {
        this.id = data.id
        this.name = data.name
        this.chats = data.chats
        this.entry_point = data.entry_point
        this.on_new_chat = data.on_new_chat
    }

    async newMessage(chat: Chat) {
        this.chats = this.chats.filter((item) => item.id !== chat.id)
        this.chats.unshift(chat)

        const io = getIoInstance()
        io.to(this.id).emit("message:new", chat)
    }
}