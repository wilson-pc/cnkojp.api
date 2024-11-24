import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { folders } from '../schema'
import { Env } from '../types'

const downloadRoute = new Hono<Env>()

downloadRoute.get('/lite/:messageId', async (c) => {
  const messageId = c.req.param('messageId')



  const [message] = await c.var.telegram.getMessages(-1002225807112, { ids: 37 })
    
  if (!message || !message.media) {
    return c.json(
      { error: 'El mensaje no contiene un archivo descargable' },
      400
    )
  }

  const fileBuffer = await c.var.telegram.downloadMedia(message.media,{
    
        progressCallback: (progress:number) => {
          console.log(`Progreso: ${(progress * 100).toFixed(2)}%`);
        },
        
  })

  const fileName =
    message.media.document?.attributes.find(
      (attr:any) => attr._ === 'DocumentAttributeFilename'
    )?.fileName || 'archivo_descargado'

  // Sirviendo el archivo directamente al cliente
  c.header('Content-Disposition', `attachment; filename="${fileName}"`)
  c.header('Content-Type', 'application/octet-stream')
  return c.body(fileBuffer as any)
})
downloadRoute.get('/', async (c) => {
  const foldersRs = await db.query.folders.findMany({
    orderBy: desc(folders.createdAt)
  })
  return c.json(foldersRs)
})

export default downloadRoute
