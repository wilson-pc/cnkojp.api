import { TelegramClient } from '@mtcute/node'
import { createId } from '@paralleldrive/cuid2';
import { resolve } from 'path';

const tg = new TelegramClient({
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
const media= await tg.uploadFile({ file:resolve('D378488C-FF64-4F9D-8D73-766A0279FE90_32548479.mp4') })
const thumb= await tg.uploadFile({ file:resolve('images.jpg') })

      const uploaded:any=  await tg.sendMedia(-1002225807112, {
        file: media,
        type: 'video',
        fileMime: 'video/mp4',
        fileName: 'D378488C-FF64-4F9D-8D73-766A0279FE90_32548479.mp4',
        supportsStreaming: true,
        thumb:thumb,
        
      }) 

      console.log('Uploaded media:', uploaded)
      console.log('Media file ID:', media)
          console.log('Media files ID:', media.inputFile.id.toString())
/*
  const peer = await tg.resolvePeer('@DWdmic')

  const dialogs:any = await tg.searchMessages({chatId:peer,limit:10,filter:{
    _:'inputMessagesFilterVideo'
  }})

  for (const element of dialogs) {
  
      try {
        console.log("descargando",element.media)
        const stream= 
        tg.downloadAsNodeStream(element?.media?.fileId)

        await tg.downloadToFile(element?.media?.fileName??createId()+".mp4",element?.media?.fileId,{
          progressCallback: (progress) => {
            console.log('Progress:', progress)
          },

        })
      } catch (error) {
        console.log(error)
        
      }
    
  }
      */
})()

async function checkSignedIn() {
  try {
    return await tg.getMe()
  } catch (e) {
    return null
  }
}
