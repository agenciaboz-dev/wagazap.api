import { WithoutFunctions } from "../helpers"
import { NagaMessage } from "../Nagazap"
import { WashimaGroupUpdate } from "../Washima/WashimaGroupUpdate"
import { WashimaMessage } from "../Washima/WashimaMessage"

export type ChatDto = WithoutFunctions<Chat>

export class Chat {
    id: string
    washima_id?: string
    washima_chat_id?: string

    nagazap_id?: string

    name: string
    phone: string
    is_group?: boolean
    profile_pic?: string
    last_message: WashimaMessage | NagaMessage
    unread_count: number

    constructor(data: ChatDto) {
        this.id = data.id
        this.washima_id = data.washima_id
        this.name = data.name
        this.phone = data.phone
        this.profile_pic = data.profile_pic
        this.washima_chat_id = data.washima_chat_id
        this.is_group = data.is_group
        this.last_message = data.last_message
        this.unread_count = data.unread_count
        this.nagazap_id = data.nagazap_id
    }

    async getMessages() {
        if (this.washima_id && this.washima_chat_id) {
            const messages = await WashimaMessage.getChatMessages(this.washima_id, this.washima_chat_id, !!this.is_group)
            if (this.is_group) {
                const group_updates = await WashimaGroupUpdate.getGroupUpdates(this.washima_chat_id)
                return { messages, group_updates }
            }

            return { messages }
        }

        if (this.nagazap_id) {
        }
    }
}