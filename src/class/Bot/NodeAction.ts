import { uid } from "uid"
import { Board } from "../Board/Board"
import { Chat, ChatDto } from "../Board/Chat"
import { WithoutFunctions } from "../helpers"
import { Bot, BotMessageForm, PausedInteraction } from "./Bot"
import { Nagazap } from "../Nagazap"
import { Washima } from "../Washima/Washima"
import { WashimaMessage } from "../Washima/WashimaMessage"
import { getIoInstance } from "../../io/socket"

export type ValidAction = "board:room:chat:new" | "bot:end" | "nagazap:blacklist:add"

export type NodeActionDto = WithoutFunctions<NodeAction>

export interface ActionSettings {
    misconfigured?: boolean
    [key: string]: any
}

export class NodeAction {
    target: ValidAction
    settings: ActionSettings

    static init(dto: NodeActionDto) {
        return new NodeAction(dto)
    }

    constructor(data: NodeActionDto) {
        this.target = data.target
        this.settings = data.settings
    }

    async run(data: BotMessageForm, bot: Bot) {
        if (this.settings.misconfigured) return

        switch (this.target) {
            case "board:room:chat:new": {
                const settings = this.settings as { board_id?: string; room_id?: string }
                if (!settings.board_id) return

                const board = await Board.find(settings.board_id)
                let chat: Chat
                console.log({ chat_id: data.chat_id })
                if (data.platform === "nagazap") {
                    const nagazap = await Nagazap.getById(data.platform_id)
                    const nagaChat = (await nagazap.getConversations()).get(data.chat_id)!
                    const lastMessage = nagaChat[nagaChat.length - 1]
                    chat =
                        board.getChatByPlatform("nagazap", nagazap.id, data.chat_id) ||
                        new Chat({
                            id: uid(),
                            last_message: lastMessage,
                            name: lastMessage.name,
                            phone: lastMessage.from,
                            unread_count: 1,
                            is_group: false,
                            nagazap_id: nagazap.id,
                        })
                } else {
                    const washima = Washima.find(data.platform_id)
                    if (!washima) throw "washima não encontrado"

                    const washimaChat = await washima.client.getChatById(data.chat_id)
                    const messages = await WashimaMessage.getChatMessages(washima.id, washimaChat.id._serialized, false)
                    const last_message = messages[messages.length - 1]
                    const contact = await washimaChat.getContact()
                    const profilePic = await washima.getCachedProfilePicture(data.chat_id, "chat")

                    chat =
                        board.getChatByPlatform("washima", washima.id, data.chat_id) ||
                        new Chat({
                            id: uid(),
                            last_message: last_message,
                            name: washimaChat.name,
                            phone: contact.number,
                            washima_chat_id: data.chat_id,
                            washima_id: washima.id,
                            unread_count: washimaChat.unreadCount,
                            is_group: washimaChat.isGroup,
                            profile_pic: profilePic?.url,
                        })
                }
                await board.newChat(chat, settings.room_id)
                board.emit()
                break
            }

            case "bot:end": {
                const settings = this.settings as { expiry: number }
                bot.pauseChat(data.chat_id, settings.expiry)
                break
            }

            case "nagazap:blacklist:add": {
                if (data.platform !== "nagazap") return
                const nagazap = await Nagazap.getById(data.platform_id)
                const chat = await nagazap.getMessages(data.chat_id)
                if (chat.length === 0) return

                const lastMessage = chat[chat.length - 1]

                await nagazap.addToBlacklist(lastMessage.from, lastMessage.name)
                break
            }
        }
    }
}
