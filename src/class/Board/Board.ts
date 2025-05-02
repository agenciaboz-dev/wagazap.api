import { Prisma } from "@prisma/client"
import { Room, RoomDto, RoomForm, RoomTrigger } from "./Room"
import { prisma } from "../../prisma"
import { WithoutFunctions } from "../helpers"
import { Department, department_include } from "../Department"
import { User, user_include } from "../User"
import { uid } from "uid"
import { Chat, ChatDto } from "./Chat"
import WAWebJS from "whatsapp-web.js"
import { Washima } from "../Washima/Washima"
import { WashimaMessage } from "../Washima/WashimaMessage"
import { Socket } from "socket.io"
import { getIoInstance } from "../../io/socket"
import { NagaChat, NagaMessage, Nagazap } from "../Nagazap"
import pTimeout from "p-timeout"

export type BoardPrisma = Prisma.BoardGetPayload<{}>
export interface BoardForm {
    name: string
}

export interface BoardWashimaSettings {
    washima_id: string
    washima_name: string
    unread_only: boolean
    room_id?: string
}

export interface BoardNagazapSettings {
    nagazap_id: string
    nagazap_name: string
    unread_only: boolean
    room_id?: string
}

export interface HandleWashimaMessageDto {
    company_id: string
    chat: WAWebJS.Chat
    washima: Washima
    message: WashimaMessage
}

export interface HandleWashimaDeleteDto {
    washima_id: string
    company_id: string
}

export interface BoardAccess {
    users: User[]
    departments: Department[]
}

export interface TransferChatForm {
    chat_id: string
    destination_board_id: string
    destination_room_id: string
    copy?: boolean
}

export class Board {
    id: string
    name: string
    created_at: string
    rooms: Room[]
    entry_room_id: string
    entry_room_index: number
    company_id: string
    washima_settings: BoardWashimaSettings[]
    nagazap_settings: BoardNagazapSettings[] = []

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
            const board = await Board.find(boardDto.id)
            board.update(boardDto)
            socket.to(boardDto.id).emit("board:update", boardDto)
        })
        socket.on("board:room:chat:clone", async (chatDto: WithoutFunctions<Chat>, clone: RoomTrigger) => {
            const board = await Board.find(clone.board_id)
            const chat = new Chat(chatDto)
            await board.newChat(chat, clone.room_id)
            board.emit()
        })
        socket.on("board:room:chat:remove", async (chatDto: WithoutFunctions<Chat>, data: RoomTrigger) => {
            const board = await Board.find(data.board_id)
            board.removeChat(chatDto.id)
            board.emit()
            board.saveRooms()
        })
    }

    static async handleNagazapNewMessage(message: NagaMessage, company_id: string) {
        const chat: ChatDto = {
            id: uid(),
            name: message.name,
            phone: message.from,
            nagazap_id: message.nagazap_id,
            last_message: message,
            unread_count: 1,
        }

        const boards = await this.getCompanyBoards(company_id)
        for (const board of boards) {
            await board.handleMessage(chat)
        }
    }

    static async handleWashimaNewMessage(data: HandleWashimaMessageDto) {
        // console.log("new message")
        // console.log(data.washima.name, data.chat.id, data.message.id)
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
            await board.handleMessage(chat)
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
        const initialRoom = new Room({ id: uid(), name: "Sala 1", chats: [], entry_point: true })
        const result = await prisma.board.create({
            data: {
                created_at: new Date().getTime().toString(),
                name: data.name,
                entry_room_id: initialRoom.id,
                rooms: JSON.stringify([initialRoom]),
                company_id,
                washima_settings: JSON.stringify([]),
                nagazap_settings: JSON.stringify([]),
            },
        })

        const board = new Board(result)
        return board
    }

    static async handleWashimaDelete(data: HandleWashimaDeleteDto) {
        const boards = await this.getCompanyBoards(data.company_id)
        boards.forEach((board) => board.handleWashimaDelete(data.washima_id))
    }

    constructor(data: BoardPrisma) {
        this.id = data.id
        this.company_id = data.company_id
        this.name = data.name
        this.created_at = data.created_at
        this.rooms = JSON.parse(data.rooms as string).map((room: RoomDto) => new Room(room))
        this.entry_room_id = data.entry_room_id
        this.washima_settings = JSON.parse(data.washima_settings as string)
        this.nagazap_settings = JSON.parse(data.nagazap_settings as string)
        this.entry_room_index = this.getEntryRoomIndex()
    }

    load(data: BoardPrisma) {
        this.id = data.id
        this.company_id = data.company_id
        this.name = data.name
        this.created_at = data.created_at
        this.rooms = JSON.parse(data.rooms as string).map((room: RoomDto) => new Room(room))
        this.entry_room_id = data.entry_room_id
        this.washima_settings = JSON.parse(data.washima_settings as string)
        this.nagazap_settings = JSON.parse(data.nagazap_settings as string)
        this.entry_room_index = this.getEntryRoomIndex()
    }

    getEntryRoom() {
        const room = this.rooms.find((item) => item.id === this.entry_room_id)
        if (!room) throw "Nenhuma sala padrão configurada"

        return room
    }

    getEntryRoomIndex() {
        return this.rooms.findIndex((room) => room.id === this.entry_room_id)
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
                washima_settings: data.washima_settings ? JSON.stringify(data.washima_settings) : undefined,
                nagazap_settings: data.nagazap_settings ? JSON.stringify(data.nagazap_settings) : undefined,
            },
        })
        this.load(result)
    }

    async delete() {
        const result = await prisma.board.delete({ where: { id: this.id } })
        return result
    }

    async saveRooms() {
        await this.update({ rooms: this.rooms, washima_settings: this.washima_settings, nagazap_settings: this.nagazap_settings })
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

        if (this.getChatById(chat.id)) {
            return
        }

        room.chats.unshift(chat)
        this.saveRooms()
        if (room.on_new_chat) {
            const targetBoard = await Board.find(room.on_new_chat.board_id)
            await targetBoard.newChat(chat, room.on_new_chat.room_id)
        }
    }

    getWashimaSetting(washima_id?: string) {
        return this.washima_settings.find((item) => item.washima_id === washima_id)
    }

    getNagazapSetting(nagazap_id?: string) {
        return this.nagazap_settings.find((item) => item.nagazap_id === nagazap_id)
    }

    async handleMessage(chatDto: ChatDto) {
        let chat = new Chat(chatDto)
        const roomWithChat = this.rooms.find((room) =>
            room.chats.find((item) => {
                if (
                    (item.washima_id && item.washima_id === chat.washima_id && item.washima_chat_id === chatDto.washima_chat_id) ||
                    (item.nagazap_id && item.nagazap_id === chat.nagazap_id && item.phone === chatDto.phone)
                ) {
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
            await this.saveRooms()
        } else {
            const setting = this.getWashimaSetting(chatDto.washima_id) || this.getNagazapSetting(chatDto.nagazap_id)
            if (!setting) return false

            await this.newChat(chat, setting.room_id)
        }

        this.emit()
    }

    async handleWashimaSettingsChange(data: BoardWashimaSettings[]) {
        return new Promise<boolean>(async (resolve) => {
            console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa tocou aqui")
            const newSettings = data.filter(
                (washima_setting) => !this.washima_settings.find((item) => item.washima_id === washima_setting.washima_id)
            )

            if (newSettings.length > 0) {
                this.emit("sync:pending", undefined)
                resolve(true)
            }

            const deletedSettings = this.washima_settings.filter(
                (current_setting) => !data.find((item) => item.washima_id === current_setting.washima_id)
            )

            console.log({ newSettings, deletedSettings, data })

            deletedSettings.forEach(async (setting) => this.unsyncWashima(setting))
            for (const setting of newSettings) {
                await this.syncWashima(setting)
            }

            this.washima_settings = data
            await this.saveRooms()
            this.emit()
            if (newSettings.length > 0) {
                this.emit("sync:done", undefined)
            }

            console.log("synced")
            resolve(true)
        })
    }

    unsyncWashima(data: BoardWashimaSettings) {
        console.log(`unsyncing ${data.washima_id}`)
        this.rooms.forEach((room, index) => {
            this.rooms[index].chats = room.chats.filter((chat) => chat.washima_id !== data.washima_id)
        })
    }

    async syncWashima(data: BoardWashimaSettings) {
        console.log({ data })
        const washima = Washima.find(data.washima_id)
        if (washima) {
            console.log(`syncing ${washima.name}`)
            const messages = await WashimaMessage.getWashimaMessages(data.washima_id)
            console.log(messages.length)
            const chats: Chat[] = []

            for (const message of messages) {
                console.log(`starting message ${messages.indexOf(message) + 1} de ${messages.length}`)
                const chatIndex = chats.findIndex((chat) => chat.washima_chat_id === message.chat_id)

                if (messages.indexOf(message) + 1 === 2053) {
                    console.log({ message })
                }

                if (message.from === "0@c.us") {
                    continue
                }

                if (chatIndex >= 0 && chats[chatIndex].washima_id === data.washima_id) {
                    continue
                }

                const washima_chat = await washima.client.getChatById(message.chat_id)
                if (data.unread_only && washima_chat.unreadCount === 0) {
                    continue
                }

                const lastMessage = (await WashimaMessage.getChatMessages(washima.id, washima_chat.id._serialized, washima_chat.isGroup, 0, 1))[0]
                if (messages.indexOf(message) + 1 === 2053) {
                    console.log({ lastMessage })
                }

                const contact = await washima_chat.getContact()
                if (messages.indexOf(message) + 1 === 2053) {
                    console.log({ contact })
                }

                const profilePic = await pTimeout(washima.getCachedProfilePicture(washima_chat.id._serialized, "chat"), {
                    milliseconds: 10 * 1000,
                }).catch(() => {})
                if (messages.indexOf(message) + 1 === 2053) {
                    console.log({ profilePic })
                }

                const chat = new Chat({
                    id: uid(),
                    last_message: lastMessage,
                    name: contact.name || contact.pushname,
                    phone: contact.number,
                    unread_count: washima_chat.unreadCount,
                    washima_chat_id: washima_chat.id._serialized,
                    washima_id: data.washima_id,
                    is_group: washima_chat.isGroup,
                    profile_pic: profilePic?.url,
                })
                if (messages.indexOf(message) + 1 === 2053) {
                    console.log({ chat })
                }

                chats.push(chat)
                console.log(`done ${messages.indexOf(message) + 1} de ${messages.length}`)
            }

            console.log("building target room")
            const target_room_index = this.rooms.findIndex((room) => room.id === (data.room_id || this.entry_room_id))
            this.rooms[target_room_index].chats = [...chats, ...this.rooms[target_room_index].chats]
            console.log("finished")
        } else {
            console.log(`${data.washima_id} não encontrado`)
        }
    }

    async handleNagazapSettingsChange(data: BoardNagazapSettings[]) {
        return new Promise<boolean>(async (resolve) => {
            const newSettings = data.filter(
                (nagazap_setting) => !this.nagazap_settings.find((item) => item.nagazap_id === nagazap_setting.nagazap_id)
            )

            if (newSettings.length > 0) {
                this.emit("sync:pending", undefined)
                resolve(true)
            }

            const deletedSettings = this.nagazap_settings.filter(
                (current_setting) => !data.find((item) => item.nagazap_id === current_setting.nagazap_id)
            )

            console.log({ newSettings, deletedSettings, data })
            this.nagazap_settings = data

            deletedSettings.forEach(async (setting) => this.unsyncNagazap(setting))
            await Promise.all(newSettings.map(async (setting) => await this.syncNagazap(setting)))

            await this.saveRooms()
            this.emit()
            if (newSettings.length > 0) {
                this.emit("sync:done", undefined)
            }

            console.log("synced")
            resolve(true)
        })
    }

    unsyncNagazap(data: BoardNagazapSettings) {
        console.log(`unsyncing ${data.nagazap_id}`)
        this.rooms.forEach((room, index) => {
            this.rooms[index].chats = room.chats.filter((chat) => chat.nagazap_id !== data.nagazap_id)
        })
    }

    async syncNagazap(data: BoardNagazapSettings) {
        const nagazap = await Nagazap.getById(data.nagazap_id)
        if (nagazap) {
            console.log(`syncing nagazap ${nagazap.displayName}`)
            const conversations = await nagazap.getConversations()

            let chats: Chat[] = []
            conversations.forEach((messages) =>
                chats.push(
                    new Chat({
                        id: uid(),
                        last_message: messages[messages.length - 1],
                        name: messages.find((item) => item.name !== nagazap.displayPhone)?.name || "EITA PREULA",
                        phone: messages[0].from,
                        unread_count: 0,
                        nagazap_id: nagazap.id,
                    })
                )
            )

            if (data.unread_only) {
                chats = chats.filter((chat) => (chat.last_message as NagaMessage).name !== nagazap.displayPhone!)
            }

            const target_room_index = this.rooms.findIndex((room) => room.id === (data.room_id || this.entry_room_id))
            this.rooms[target_room_index].chats = [...chats, ...this.rooms[target_room_index].chats]
        }
    }

    handleWashimaDelete(washima_id: string) {
        const washima_setting = this.getWashimaSetting(washima_id)
        if (!washima_setting) return false

        this.washima_settings = this.washima_settings.filter((item) => item.washima_id !== washima_id)
        this.unsyncWashima(washima_setting)
        this.saveRooms()
        this.emit()
    }

    emit(event = "board:update", data: any = this) {
        const io = getIoInstance()
        io.to(this.id).emit(event, data)
    }

    async getAccess() {
        const users_result = await prisma.user.findMany({ where: { boards: { some: { id: this.id } } }, include: user_include })
        const users = users_result.map((item) => new User(item))

        const departments_result = await prisma.department.findMany({ where: { boards: { some: { id: this.id } } }, include: department_include })
        const departments = departments_result.map((item) => new Department(item))

        return { users, departments }
    }

    async changeAccess(access: BoardAccess) {
        await prisma.board.update({
            where: { id: this.id },
            data: {
                users: { set: [], connect: access.users.map((user) => ({ id: user.id })) },
                departments: { set: [], connect: access.departments.map((department) => ({ id: department.id })) },
            },
        })
    }

    async getDestinationBoard(board_id: string) {
        if (board_id === this.id) {
            return this
        }

        return await Board.find(board_id)
    }

    getChatRoomIndex(chat_id: string) {
        for (const [index, room] of this.rooms.entries()) {
            const chatIndex = room.chats.findIndex((item) => item.id === chat_id)
            if (chatIndex > -1) {
                return { room: index, chat: chatIndex }
            }
        }

        throw "chat não encontrado"
    }

    getChatByPlatform(platform: "nagazap" | "washima", platform_id: string, plataform_chat_identifier: string) {
        for (const room of this.rooms) {
            for (const chat of room.chats) {
                if (platform === "washima") {
                    if (chat.washima_id === platform_id && chat.washima_chat_id === plataform_chat_identifier) {
                        return chat
                    }
                } else {
                    if (chat.nagazap_id === platform_id && chat.phone === plataform_chat_identifier) {
                        return chat
                    }
                }
            }
        }
    }

    getChatByPhone(phone: string) {
        for (const room of this.rooms) {
            for (const chat of room.chats) {
                if (chat.phone === phone) {
                    return chat
                }
            }
        }
    }

    getChatById(chat_id: string) {
        try {
            const indexes = this.getChatRoomIndex(chat_id)
            return this.rooms[indexes.room].chats[indexes.chat]
        } catch (error) {
            console.log(error)
        }
    }

    removeChat(chat_id: string) {
        const indexes = this.getChatRoomIndex(chat_id)
        this.rooms[indexes.room].chats = this.rooms[indexes.room].chats.filter((chat) => chat.id !== chat_id)
    }

    async transferChat(data: TransferChatForm) {
        const destinationBoard = await this.getDestinationBoard(data.destination_board_id)
        const chat = this.getChatById(data.chat_id)
        if (!chat) return

        if (!data.copy) {
            this.removeChat(data.chat_id)
            this.saveRooms()
        }

        await destinationBoard.newChat(chat, data.destination_room_id)
    }

    getRoom(room_id: string) {
        const room = this.rooms.find((item) => item.id === room_id)

        if (!room) throw "sala não encontrada"

        return room
    }
}
