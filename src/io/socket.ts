import { Socket } from "socket.io"
import { Server as SocketIoServer } from "socket.io"
import { Server as HttpServer } from "http"
import { Server as HttpsServer } from "https"
import { Washima, WashimaDeleteMessagesForm, WashimaMediaForm } from "../class/Washima/Washima"
import { WashimaMessage } from "../class/Washima/WashimaMessage"
import { Nagazap, NagazapResponseForm } from "../class/Nagazap"
import { Board } from "../class/Board/Board"
import { Contact } from "whatsapp-web.js"

let io: SocketIoServer | null = null

export const initializeIoServer = (server: HttpServer | HttpsServer) => {
    io = new SocketIoServer(server, {
        cors: { origin: "*" },
        maxHttpBufferSize: 1e8,
    })
}

export const getIoInstance = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized. Please call initializeIoServer first.")
    }
    return io
}

export const handleSocket = (socket: Socket) => {
    console.log(`new connection: ${socket.id}`)

    socket.on("disconnect", async (reason) => {
        console.log(`disconnected: ${socket.id}`)
        console.log({ reason })
    })

    socket.on("user:join", (user_id) => socket.join(user_id))
    socket.on("user:leave", (user_id) => socket.leave(user_id))

    socket.on("washima:channel:join", (channel: string) => socket.join(channel))
    socket.on("washima:channel:leave", (channel: string) => socket.leave(channel))

    socket.on("washima:message", (washima_id: string, chat_id: string, message?: string, media?: WashimaMediaForm, replyMessage?: WashimaMessage) =>
        Washima.sendMessage(socket, washima_id, chat_id, message, media, replyMessage)
    )
    socket.on("washima:message:contact", (washima_id: string, contact_id: string, message_id: string) =>
        Washima.getContact(socket, washima_id, contact_id, message_id)
    )

    socket.on("washima:message:delete", (washima_id: string, data: WashimaDeleteMessagesForm) => Washima.deleteMessages(socket, washima_id, data))

    socket.on("washima:message:react", (washima_id: string, message_id: string, emoji: string) =>
        Washima.newReaction(socket, washima_id, message_id, emoji)
    )

    socket.on("washima:forward", (washima_id: string, chat_id: string, destinatary_ids: string[], message_ids: string[]) =>
        Washima.forwardMessage(socket, washima_id, chat_id, destinatary_ids, message_ids)
    )

    socket.on("washima:author", async (washima_id: string, contact_id: string, response: (author?: string) => void) => {
        const washima = Washima.find(washima_id)
        console.log(washima_id, contact_id)
        const contact = await washima?.getContact(contact_id)
        console.log(contact)
        response(contact)
    })

    socket.on("nagazap:response", (nagazap_id: string, data: NagazapResponseForm) => Nagazap.sendResponse(nagazap_id, data))

    Board.handleSocket(socket)
}
