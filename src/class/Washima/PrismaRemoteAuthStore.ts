// import { Store } from "whatsapp-web.js"
// import { prisma } from "../../prisma"
// import { now } from "lodash"
// import path from "path"
// import { access, accessSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs"
// import { createHash } from "crypto"

// interface Options {
//     session: string
// }

// export class PrismaRemoteAuthStore implements Store {
//     private tempDir: string

//     constructor() {
//         this.tempDir = path.join(process.cwd(), "wwebjs_temp")
//         this.ensureTempDirSync()
//     }

//     private ensureTempDirSync() {
//         try {
//             mkdirSync(this.tempDir, { recursive: true })
//         } catch (error) {
//             console.error("Temp directory creation failed:", error)
//         }
//     }

//     async sessionExists(options: Options) {
//         const result = await prisma.washimaSession.findUnique({ where: { session: options.session } })
//         return !!result
//     }

//     async save({ session }: Options) {
//         try {
//             const sourcePath = path.join(this.tempDir, `${session}.zip`)
//             const zipBuffer = await readFileSync(sourcePath)

//             // Verify ZIP integrity
//             if (!this.isValidZip(zipBuffer)) {
//                 throw new Error("Invalid ZIP file contents")
//             }

//             await prisma.washimaSession.upsert({
//                 where: { session: session },
//                 create: {
//                     session: session,
//                     data: zipBuffer,
//                     // checksum: this.createChecksum(zipBuffer),
//                     created_at: now().toString(),
//                     last_updated: now().toString(),
//                 },
//                 update: {
//                     data: zipBuffer,
//                     // checksum: this.createChecksum(zipBuffer),
//                     last_updated: now().toString(),
//                 },
//             })

//             await this.cleanupFiles(session)
//             console.log(`Session ${session} saved successfully`)
//         } catch (error) {
//             console.error("Save operation failed:", error)
//             await this.cleanupFiles(session)
//             throw error
//         }
//     }

//     async extract({ session, path: outputPath }: Options & { path: string }) {
//         try {
//             const sessionData = await prisma.washimaSession.findUnique({
//                 where: { session: session },
//             })

//             if (!sessionData?.data) {
//                 throw new Error("Session data not found")
//             }

//             // Verify checksum before extraction
//             // if (sessionData.checksum !== this.createChecksum(sessionData.data)) {
//             //     throw new Error("Session data corruption detected")
//             // }

//             const tempPath = path.join(this.tempDir, `${session}.zip`)
//             writeFileSync(tempPath, sessionData.data)

//             // Atomic file replacement
//             renameSync(tempPath, outputPath!)
//             console.log(`Session ${session} extracted to ${outputPath}`)
//         } catch (error) {
//             console.error("Extract operation failed:", error)
//             await this.cleanupFiles(session)
//             throw error
//         }
//     }

//     async delete({ session }: Options) {
//         try {
//             await prisma.washimaSession.delete({
//                 where: { session: session },
//             })
//             await this.cleanupFiles(session)
//             console.log(`Session ${session} deleted successfully`)
//         } catch (error) {
//             console.error("Delete operation failed:", error)
//             throw error
//         }
//     }

//     private createChecksum(data: Buffer): string {
//         return createHash("md5").update(data).digest("hex")
//     }

//     private isValidZip(buffer: Buffer): boolean {
//         // Basic ZIP header check (PK\x03\x04)
//         return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
//         // 
//     }

//     private async cleanupFiles(session: string) {
//         const patterns = [path.join(this.tempDir, `${session}.zip`), path.join(process.cwd(), `${session}.zip`)]

//         for (const filePath of patterns) {
//             try {
//                 unlinkSync(filePath)
//             } catch (error: any) {
//                 if (error.code !== "ENOENT") {
//                     console.error(`Failed to cleanup ${filePath}:`, error)
//                 }
//             }
//         }
//     }
// }
