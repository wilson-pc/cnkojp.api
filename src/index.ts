import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import folderRoute from './controllers/folder.controller'
import { Env } from './types'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'
import { createCustomId, formatBytes, isNumeric } from './utils'
import { db } from './db'
import { eq } from 'drizzle-orm'
import { files } from './schema'
import { appendFileSync } from 'fs'
import { resolve } from 'path'
import filesRouter from './controllers/files.controller'
import { authController } from './controllers/auth.controller'

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()

const apiId = process.env.TELEGRAM_API_ID ?? 0
const apiHash = process.env.TELEGRAM_API_HASH ?? ''
const stringSession = new StringSession(process.env.TELE_SESSION ?? '')
const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
  connectionRetries: 5
});
(async () => {
  console.log("Conectando a Telegram...");
  await client.start({
  } as any);

  console.log("Conectado a Telegram.");
})();
const app = new Hono<Env>()
app.use('/*', cors())


app.use(
  '/static/*',
  serveStatic({
    root: './',
    onFound: (_path, c) => {
      c.header('Content-Disposition', `attachment`)
    }
  })
)
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage: async (event, ws) => {
        const data = JSON.parse(event.data.toString())
        console.log(data)
        const file = await db.query.files.findFirst({
          where: eq(files.id, data.id)
        })
        if (!file) {
          ws.send(
            JSON.stringify({ error: 'El archivo no existe', status: 'error' })
          )
          return
        }
        let chatId: string | number = -1002225807112
        if (data.type === 'original') {
          if (isNumeric(file.chatId)) {
            chatId = Number(file.chatId)
          } else {
            chatId = file.chatId
          }
          if (file.originalCached) {
            ws.send(
              JSON.stringify({ status: 'cached', file: file.originalCached })
            )
            return
          }
        } else {
          if (file.liteCached) {
            ws.send(JSON.stringify({ status: 'cached', file: file.liteCached }))
            return
          }
        }
        console.log('fqwf9', chatId)
        const [message] = await client.getMessages(chatId, {
          ids:
            data.type === 'original'
              ? Number(file.messageId)
              : Number(file.newMessageId)
        })

        if (!message || !message.media) {
          ws.send(
            JSON.stringify({
              error: 'El archivo no existe',
              status: 'error'
            })
          )
        } else {
          ws.send(JSON.stringify({ status: 'start' }))
          const filename = `${createCustomId()}_${file.name}`
          await client.downloadMedia(message.media, {
            progressCallback: (progress: any, total: any) => {
              ws.send(
                JSON.stringify({
                  progress: formatBytes(progress),
                  total: formatBytes(total),
                  status: 'downloading'
                })
              )
            },
            outputFile: {
              write: (buffer: Buffer) => {
                appendFileSync(resolve('static', filename), buffer as any)
                ws.send(buffer as any)
              }
            }
          })
          if (data.type === 'original') {
            await db
              .update(files)
              .set({
                originalCached: filename
              })
              .where(eq(files.id, data.id))
          } else {
            await db
              .update(files)
              .set({
                liteCached: filename
              })
              .where(eq(files.id, data.id))
          }
          ws.send(JSON.stringify({ status: 'completed' }))
        }
      },
      onClose: () => {
        console.log('Connection closed')
      }
    }
  })
)

app.route('/api/folder', folderRoute)
app.route('/api/file', filesRouter)
app.route('/auth', authController)
//app.route('/downloader', downloadRoute)
export default {
  port: 3005,
  fetch: app.fetch,
  websocket
}
