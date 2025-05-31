import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { Env, TelegramMedia } from './types'

import { db } from './db'
import { eq } from 'drizzle-orm'
import { files } from './schema/index'
import { Message, TelegramClient as tgClient } from '@mtcute/node'
import 'dotenv/config'
import folderRoute from './controllers/folderController'
import filesRouter from './controllers/filesController'
import { authController } from './controllers/authController'


async function checkSignedIn() {
  try {
    return await tg.getMe()
  } catch (e) {
    return null
  }
}
function isNumber(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

//

const tg = new tgClient({
  apiId: Number(process.env.TELEGRAM_API_ID) ?? 0,
  apiHash: process.env.TELEGRAM_API_HASH ?? '',
  storage: 'my-account'
})

;(async () => {
  if ((await checkSignedIn()) === null) {
    const self = await tg.start({
      phone: () => tg.input('Phone > '),
      code: () => tg.input('Code > ')
    })
  } else {
    const self = await tg.start({})
    console.log(`Logged history in as ${self.displayName}`)
  }
})()
const app = new Hono<Env>()
app.use('/*', cors())
app.get('/', async (c) => {
  return c.text('Hello world!')
})
app.get('/download/lite/:id', async (c) => {
  const fileId = c.req.param('id')
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId)
  })
  console.log('file', file)

    const peerId= isNumber(file?.newChatId)?Number(file?.newChatId ?? 0):file?.newChatId
  const peer = await tg.resolvePeer(peerId??'')
  console.log('peer', peer)
  const [msg] = await tg.getMessages(peer, [Number(file?.newMessageId) ?? 0])
  const media = msg?.media as any

  
  const nodeStream = tg.downloadAsNodeStream(media?.fileId??'')


// Replace the fileName line with:
const originalName = file?.name || 'download.mp4';
const textToAdd = '_av1'; // texto que quieres agregar
const fileName = encodeURIComponent(originalName.replace(/(\.[^.]+)?$/, textToAdd + '$&'));
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        // Asegurarse de que chunk sea un Uint8Array
        const buffer = Buffer.from(chunk)
        controller.enqueue(buffer)
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err) => {
        controller.error(err)
      })
    }
  })

  return new Response(webStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      'Content-Length': ""+file?.info?.size +""
    }
  })
})

app.get('/download/:id', async (c) => {
  const fileId = c.req.param('id')
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId)
  })
 
    const peerId= isNumber(file?.chatId)?Number(file?.chatId ?? 0):file?.chatId
  const peer = await tg.resolvePeer(peerId as any)
  console.log('peer', peer)
  const [msg] = await tg.getMessages(peer, [Number(file?.messageId) ?? 0])
  const media = msg?.media as any
  
  const nodeStream = tg.downloadAsNodeStream(media?.fileId??'')

  const fileName = encodeURIComponent(file?.name || 'download')

  const webStream = new ReadableStream({
    start(controller) {
    // Handler para limpiar recursos
    const cleanup = () => {
      try {
        nodeStream.destroy();
        controller.close();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };

    nodeStream.on('data', (chunk) => {
      try {
        const buffer = Buffer.from(chunk);
        controller.enqueue(buffer);
      } catch (err) {
        cleanup();
      }
    });

    nodeStream.on('end', () => {
      cleanup();
    });

    nodeStream.on('error', (err) => {
      console.error('Stream error:', err);
      cleanup();
      controller.error(err);
    });
  },
  cancel() {
    // Este método se llama cuando el cliente cancela la descarga
    nodeStream.destroy();
  }
  })

  return new Response(webStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      'Content-Length': ""+file?.originalSize +""
    }
  })
})
app.route('/api/folder', folderRoute)
app.route('/api/file', filesRouter)
app.route('/auth', authController)
//app.route('/downloader', downloadRoute)
serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
})
