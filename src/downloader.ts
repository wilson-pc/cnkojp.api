import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import readline from 'readline'
import { basename, extname, resolve } from 'path'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { exec } from 'child_process'
import _ from 'lodash'
import { $ } from 'bun'
import { uploadImage } from './s3'
import { createId } from '@paralleldrive/cuid2'
import { db } from './db'
import { and, eq } from 'drizzle-orm'
import { files, folders, FolderSelect } from './schema'
import { fileExistsAndHasWeight, formatBytes, timeout } from './utils'

const apiId = process.env.TELEGRAM_API_ID ?? 0
const apiHash = process.env.TELEGRAM_API_HASH ?? ''
let chatId = process.env.CHAT_ID
const newChatId = -1002225807112
const stringSession = new StringSession(process.env.TELE_SESSION ?? '') // fill this later with the value from session.save()
const isNumber = process.env.IS_NUMBER === 'TRUE' ? true : false
;(async () => {
  console.log('Loading interactive example...')
  const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  await client.start({
    /*
      phoneNumber: async () =>
        new Promise((resolve) =>
          rl.question('Please enter your number: ', resolve)
        ),
      phoneCode: async () =>
        new Promise((resolve) =>
          rl.question('Please enter the code you received: ', resolve)
        ),
      onError: (err) => console.log(err)*/
  } as any)
  console.log('You should now be connected.')
  console.log(client.session.save()) // Save this string to avoid logging in again

  if (isNumber) {
    let result = await client.getDialogs({ archived: true })
    //  console.log(result)
    result = result.filter(
      (d: any) => d.isGroup == true && d.entity.username == null
    )
    console.log(result[0].entity?.id.toString())
    const cchat = result.filter(
      (sssd: any) => sssd.entity.id.toString() === chatId
    )[0]
    chatId = cchat.entity as any
  }

  /*
  const dialogs = await client.getDialogs()
  dialogs.forEach((dialog) => {
    console.log(
      `Nombre: ${dialog.name}, ID: ${dialog.id.toString()}, IsSuperGroup: ${
        dialog.isChannel
      }`
    )
  })*/
  //5048663150832911913
  console.log('Obteniendo el mensaje...')
  //-1002225807112
  /*
const message = await client.getMessages(-1002225807112, { ids: 14 });
console.log("Mensaje obtenido",message);
  const fileBuffer = await client.downloadMedia(
    message[0].media as any,
    {
      progressCallback: (progress:number) => {
        console.log(`Progreso: ${(progress * 100).toFixed(2)}%`);
      },
      outputFile: resolve('downloads', "jshsh.mp4")
    }
  );

*/
  /*
  const chatIds = -1002225807112;
  const resuslt = await client.sendFile(chatIds, {
    file: "./istockphoto-1574596562-640_adpp_is.mp4",
    caption: "Aquí está tu archivo 📄",
  });
  console.log("subido",resuslt.media?.document?.id.toString());
  console.log("subido",resuslt.id?.toString());
  
  const result = await client.getMessages(chatId, {
    filter: Api.InputMessagesFilterVideo as any,
    limit: 3
  })*/

  /*
  await client.sendFile('me', {
    file: './av1_6192736876781112734_16996202.mp4',
    workers: 4,
    thumb: './outeputf.jpg',
 
    attributes: [
      new Api.DocumentAttributeVideo({
        duration: 21,
        h: 1000,
        w: 666,
        supportsStreaming: true
      })
    ]
  })*/

  //  const fde = result.splice(500)
  //console.log(fde.length)

  const whitelist = await db.query.whitelist.findMany({
    columns: {
      fileId: true
    }
  })

  const result = await client.getMessages(chatId, {
    filter: Api.InputMessagesFilterVideo as any,
    limit: 500
  })
  console.log(result.length)

  const all = await db.query.files.findMany({
    columns: {
      fileId: true
    }
  })
  const allIgnore = [...whitelist, ...all]
  const fde = result.splice(400)

  const chunk = _.chunk(fde, 30)
  const currentChat: any = await db.query.folders.findFirst({
    where: eq(folders.chatId, chatId ?? '')
  })

  for await (const messages of chunk) {
    const promises: any[] = []
    messages.forEach((element: Api.Message, index: number) => {
      if (
        !allIgnore.find(
          (w) => w.fileId === element.media?.document?.id.value.toString()
        )
      ) {
        promises.push(downloader(element, client, index, currentChat))
      } else {
        console.log('ignorando', index)
      }
    })
    await Promise.all(promises)
    console.log('UNA VUELKTA')
  }
  console.log('Done.')
})()

interface FileInfo {
  vibrate: number
  duration: number
  size: number
  format: string
  width: number
  height: number
  coded: string
  codeName: string
}

type VideoInfo = FileInfo & { original: boolean }
async function getInfo(fileName: string): Promise<{ data: FileInfo }> {
  return new Promise((fin, reject) => {
    const dir = exec(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${resolve(
        'downloads/' + fileName
      )}"`,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        } else {
          let info = JSON.parse(stdout)
          const video = info.streams.find(
            (stream: any) => stream.codec_type === 'video'
          )
          if (video) {
            fin({
              data: {
                vibrate: Number(video.bit_rate) * 0.001,
                duration: Number(info.format.duration),
                size: Number(info.format.size),
                format: info.format.format_name,
                width: video.width,
                height: video.height,
                coded: video.codec_name,
                codeName: video.codec_long_name
              }
            })
          } else {
            reject({ message: 'no video' })
          }
        }
      }
    )
  })
}

async function getInfo2(
  fileName: string,
  path?: string
): Promise<{ data: FileInfo }> {
  return new Promise((fin, reject) => {
    const dir = exec(
      `ffprobe -v quiet -print_format json -show_format -show_streams "F:/png negro/drive/temp/optmized/wssllhdgww/${fileName}"`,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        } else {
          let info = JSON.parse(stdout)
          const video = info.streams.find(
            (stream: any) => stream.codec_type === 'video'
          )
          if (video) {
            fin({
              data: {
                vibrate: Number(video.bit_rate) * 0.001,
                duration: Number(info.format.duration),
                size: Number(info.format.size),
                format: info.format.format_name,
                width: video.width,
                height: video.height,
                coded: video.codec_name,
                codeName: video.codec_long_name
              }
            })
          } else {
            reject({ message: 'no video' })
          }
        }
      }
    )
  })
}

async function generateThumbLocal(
  fileName: string,
  ext = '.mp4',
  imageName = `${fileName}.avif`
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    const dir = exec(
      `ffmpeg -ss 10 -t 5 -i "${resolve(
        'downloads/' + fileName
      )}" -c:v av1_qsv -filter_complex "[0:v] fps=3,setpts=0.5*PTS" -f avif "${resolve(
        'thumb/' + imageName
      )}"
      `,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      fin({ path: resolve('thumb/' + imageName) })
    })
  })
}

async function generateThumbLocalWithHeader(
  fileName: string,
  inputDirectory: string,
  outputDirectory: string
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    //    console.log(`pyvideothumbnailer "${inputDirectory}" --columns 3 --rows 3  --header-font DejaVuSans.ttf --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override_existing --output-directory ${outputDirectory}`)
    await timeout(4000)
    const dir = exec(
      `chcp 65001 | pyvideothumbnailer "${inputDirectory}" --columns 3 --rows 3  --header-font DejaVuSans.ttf --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override-existing --output-directory ${outputDirectory}`,
      { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },function (err, stdout, stderr) {
        if (err) {
          console.log('Error en pyvideothumbnailer', err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      const responsePath = `${outputDirectory}/${fileName}.jpg`
      if (existsSync(responsePath)) {
        fin({ path: responsePath })
      } else {
        const dir2 = exec(
          `chcp 65001 | vcsi "${inputDirectory}" -t -g 3x3 --metadata-font-size 20 --metadata-font DejaVuSans.ttf -o "${outputDirectory}/${fileName}.jpg"`,
          { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
          function (err, stdout, stderr) {
            if (err) {
              console.log('Error en pyvideothumbnailer', err)
              reject(err)
              // should have err.code here?
            }
      
          }
        )

        dir2.on('exit', async function (code) {
          const responsePath = `${outputDirectory}/${fileName}.jpg`

          fin({ path: responsePath })
        })
      }
    })
  })
}

async function generateThumbLocalGrid(
  fileName: string,
  outputDirectory: string
): Promise<{ path: string }> {
  return new Promise(async (fin, reject) => {
    await timeout(4000)
    const dir = exec(
      `chcp 65001 | pyvideothumbnailer "${resolve(
        'downloads/' + fileName
      )}" --columns 3 --rows 3 --timestamp-font DejaVuSans.ttf --jpeg-quality 100 --override-existing --no-header --output-directory ${outputDirectory}`,
      { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', async function (code) {
      const responsePath = `${outputDirectory}/${fileName}.jpg`
      if (existsSync(responsePath)) {
        fin({ path: responsePath })
      } else {
        const dir2 = exec(
          `chcp 65001 | generate-video-preview "${resolve(
            'downloads/' + fileName
          )}" "${outputDirectory}/${fileName}.jpg" --rows 3 --cols 3 --quality 1`,
          { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
          function (err, stdout, stderr) {
            if (err) {
              console.log(err)
              reject(err)
              // should have err.code here?
            }
          }
        )

        dir2.on('exit', async function (code) {
          fin({ path: `${outputDirectory}/${fileName}.jpg` })
        })
      }
    })
  })
}
async function optimizeQsvAv1(
  fileName: string,
  preset = 'veryslow',
  quality: string,
  code: string,
  format: string,
  ext = '.mp4'
): Promise<{ path: string }> {
  const fee = `ffmpeg -i "${resolve(
    'downloads/' + fileName
  )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy "F:/png negro/drive/temp/optmized/wssllhdgww/${fileName.replace(
    ext,
    format
  )}"
    `
  console.log(fee)

  return new Promise((fin, reject) => {
    const dir = exec(
      `ffmpeg -i "${resolve(
        'downloads/' + fileName
      )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy  "F:/png negro/drive/temp/optmized/wssllhdgww/${fileName.replace(
        ext,
        format
      )}"
        `,
      function (err, stdout, stderr) {
        if (err) {
          console.log(err)
          reject(err)
          // should have err.code here?
        }
      }
    )

    dir.on('exit', function (code) {
      fin({
        path: `F:/png negro/drive/temp/optmized/wssllhdgww/${fileName.replace(
          ext,
          format
        )}`
      })
    })
  })
}

async function getVideo(
  fileName: string,
  ext = '.mp4',
  imageName = `${fileName}.avif`
): Promise<{
  info: VideoInfo
  thumb: { path: string }
  video: { path?: string }
}> {
  const { data: videoInfo } = await getInfo(fileName)
  const thumb = await generateThumbLocal(fileName, ext, imageName)
  let info: { data: FileInfo; original: boolean } = {} as any

  let video: { path?: string } = {}
  const large = Math.min(videoInfo.height, videoInfo.width)
  console.log(large, fileName)

  const filePath = `F:/png negro/drive/temp/optmized/wssllhdgww/${fileName.replace(
    ext,
    '.mp4'
  )}`
  const exits = await fileExistsAndHasWeight(filePath)
  if (exits) {
    const newInfo = await getInfo2(basename(filePath ?? ''))
    console.log(
      'ya existe',
      filePath,
      { ...newInfo.data, original: true },
      thumb
    )
    return {
      video: { path: filePath },
      info: { ...newInfo.data, original: true },
      thumb: thumb
    }
  } else {
    if (videoInfo.vibrate < 700) {
        /*
              video = await optimizeBrakeAv1(
                fileName,
                "quality",
                "30",
                "qsv_av1",
                ".mp4",
                ext
              );
      */
        video = await optimizeQsvAv1(
          fileName,
          'veryslow',
          '30',
          'av1_qsv',
          '.mp4',
          ext
        )
        info = {
          ...(await getInfo2(basename(video.path ?? ''))),
          original: false
        }
      
    } else {

        if (large < 365) {
          if (videoInfo.vibrate < 700) {
            console.log('sin code 365')
            video = { path: resolve('downloads', fileName) }
            info = { data: videoInfo, original: true }
          } else {
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "30",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '30',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            //fs.unlink(resolve('downloads', fileName), () => {})
            console.log('baja 365')
          }
        }
        
        if (large > 365 && large < 490) {
          if (videoInfo.vibrate < 850) {
            console.log('sin code 490')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '29',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            //    fs.unlink(resolve('downloads', fileName), () => {})
          } else {
            console.log('baja 490')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '29',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            // fs.unlink(resolve('downloads', fileName), () => {})
          }
        }
        if (large > 490 && large < 650) {
          if (videoInfo.vibrate < 1200) {
            console.log('sin code 650')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "29",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '25',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            // fs.unlink(resolve('downloads', fileName), () => {})
          } else {
            console.log('baja 650')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '25',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            // fs.unlink(resolve('downloads', fileName), () => {})
          }
        }
        if (large > 650 && large < 900) {
          if (videoInfo.vibrate < 1500) {
            console.log('sin code 1500')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '25',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            //  fs.unlink(resolve('downloads', fileName), () => {})
          } else {
            console.log('baja 900')
            /*
          video = await optimizeBrakeAv1(
            fileName,
            "quality",
            "28",
            "qsv_av1",
            ".mp4",
            ext
          );*/
            video = await optimizeQsvAv1(
              fileName,
              'veryslow',
              '25',
              'av1_qsv',
              '.mp4',
              ext
            )
            info = {
              ...(await getInfo2(basename(video.path ?? ''))),
              original: false
            }
            //fs.unlink(resolve('downloads', fileName), () => {})
          }
        }
        if (large > 900 && large < 1100) {
          console.log('baja 1100')
          /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "28",
          "qsv_av1",
          ".mp4",
          ext
        );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '24',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          // fs.unlink(resolve('downloads', fileName), () => {})
        }
        if (large > 1100 && large < 1600) {
          console.log('baja h3')
          /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "30",
          "qsv_av1",
          ".mp4",
          ext
        );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '23',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //fs.unlink(resolve('downloads', fileName), () => {})
        }

        if (large > 1600) {
          console.log('baja h3')
          /*
        video = await optimizeBrakeAv1(
          fileName,
          "quality",
          "30",
          "qsv_av1",
          ".mp4",
          ext
        );*/
          video = await optimizeQsvAv1(
            fileName,
            'veryslow',
            '22',
            'av1_qsv',
            '.mp4',
            ext
          )
          info = {
            ...(await getInfo2(basename(video.path ?? ''))),
            original: false
          }
          //   fs.unlink(resolve('downloads', fileName), () => {})
        }
        console.log('termina dentro')
      }
    }

    return {
      video: video,
      info: { ...info.data, original: info.original },
      thumb: thumb
    }
  }


async function downloader(
  message: Api.Message,
  client: TelegramClient,
  index: number,
  currentChat: FolderSelect
) {
  return new Promise(async (resolver, rejct) => {
    if (message.media && message.media.document) {
      try {
        const taskId = createId()
        const { media } = message
        const fileId = media.document.id.value
        const { duration, w, h } = media.document.attributes[0]
        const attr2 = media.document.attributes[1]
        const fer = media.document.size.value.toString()

        const archive = await db.query.files.findFirst({
          where: and(
            eq(files.fileId, fileId.toString()),
            eq(files.duration, `${duration}`),
            eq(files.duration, `${duration}`),
            eq(files.originalSize, `${fer}`)
          )
        })
        const name = attr2?.fileName
          ? `${attr2?.fileName.replace(extname(attr2?.fileName), '')}_${
              media.document.size
            }${extname(attr2?.fileName).toLowerCase()}`
          : `${fileId.toString()}.mp4`

        if (archive === undefined) {
          console.log('descargando', index, name, fer, fileId.toString())
          if (!existsSync(resolve('downloads', name))) {
            await client.downloadMedia(media, {
              outputFile: resolve('downloads', name)
            })
          }
          const { video, info, thumb } = await getVideo(
            name,
            extname(name).toLowerCase(),
            `${taskId}.avif`
          )
          console.log('Convertido', index, name, fer, fileId.toString())

          const [header, grid] = await Promise.all([
            generateThumbLocalWithHeader(
              name,
              video.path ?? '',
              resolve('thumb/header')
            ),
            generateThumbLocalGrid(name, resolve('thumb/grid'))
          ])

          const uploaded: any = await client.sendFile(newChatId, {
            file: video.path ?? '',
            workers: 4,
            thumb: grid.path ?? '',

            attributes: [
              new Api.DocumentAttributeVideo({
                duration: duration,
                h: h,
                w: w,
                supportsStreaming: true
              })
            ]
          })
          // const originalThumb=` ${chatId}/original/${taskId}.jpg`
          const animatedThumb = `${chatId}/animated/${taskId}.avif`
          const whitHeader = `${chatId}/whitHeader/${taskId}.jpg`
          const gridThumb = `${chatId}/grid/${taskId}.jpg`

          await db.insert(files).values({
            id: taskId,
            name: name,
            chatId: chatId ?? '',
            fileId: fileId.toString(),
            folderId: currentChat.id,
            type: 'video',
            messageId: message.id.toString(),
            mimeType: 'video/mp4',
            size: info.size.toString(),
            thumbAnimated: animatedThumb,
            thumbWhitHeader: whitHeader,
            fileReference: `${chatId}/${name}`,
            thumbGrid: gridThumb,
            original: true,
            originalSize: fer,
            info: info,
            duration: duration,
            newChatId: newChatId.toString(),
            newFileId: uploaded?.media?.document?.id.value,
            newMessageId: uploaded?.id.toString(),
            version: 1
          })

          await Promise.all([
            uploadImage(
              animatedThumb,
              readFileSync(thumb.path ?? ''),
              'image/avif'
            ),
            uploadImage(
              whitHeader,
              readFileSync(header.path ?? ''),
              'image/jpeg'
            ),
            uploadImage(gridThumb, readFileSync(grid.path ?? ''), 'image/jpeg')
          ])
          const infoString = JSON.stringify(info, (k, v) =>
            v && typeof v === 'object' ? v : '' + v
          )
          console.log(infoString)

          console.log('convetido', index, name)
          resolver({ status: 'finish' })
        } else {
          console.log('convetido anteriormente', index, name)
          resolver({ status: 'finish' })
        }
      } catch (error: any) {
        console.log('ERROR', index)
        console.log(error)
        resolver({ status: 'error' })
      }
    }
  })
}
