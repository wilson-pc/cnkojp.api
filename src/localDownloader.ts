import readline from 'readline'
import { basename, extname, resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { exec } from 'child_process'
import _ from 'lodash'
import { uploadImage } from './s3'
import { createId } from '@paralleldrive/cuid2'
import { db } from './db'
import { and, eq } from 'drizzle-orm'
import { files, folders, FolderSelect } from './schema/index'
import { fileExistsAndHasWeight, timeout } from './utils'
import { Message, TelegramClient } from '@mtcute/node'
import 'dotenv/config'
import { TelegramMedia } from 'types'

type LocalMessage = Message & { media: TelegramMedia }
let chatId = process.env.CHAT_ID
const newChatId = -1002225807112
const tg = new TelegramClient({
  apiId: Number(process.env.TELEGRAM_API_ID) ?? 0,
  apiHash: process.env.TELEGRAM_API_HASH ?? '',
  storage: 'my-account'
})

;(async () => {
  console.log('Loading interactive example...')
  if ((await checkSignedIn()) === null) {
    const self = await tg.start({
      phone: () => tg.input('Phone > '),
      code: () => tg.input('Code > ')
    })
  } else {
    const self = await tg.start({})
    console.log(`Logged history in as ${self.displayName}`)
  }

  const peerId = isNumber(chatId) ? Number(chatId) : chatId
  const peer = await tg.resolvePeer(peerId?? '')
  console.log('peer', peer)

  const dialogs = await tg.searchMessages({
    chatId: peer,
    limit: 100,
    filter: {
      _: 'inputMessagesFilterMusic'
    }
  })
  
 
  console.log(dialogs[dialogs.length-1].id)


  //const fde = dialogs.splice(100)

  const chunk = _.chunk(dialogs, 3)
  
  for await (const messages of chunk) {
    const promises: any[] = []
    messages.forEach((elementr: any, index: number) => {
      const element = elementr as LocalMessage
      console.log('element', element.media.fileId)

        promises.push(downloader(element, index))
     
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
      `ffprobe -v quiet -print_format json -show_format -show_streams "F:/png negro/drive/temp/optmized/${chatId}/${fileName}"`,
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
      { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      function (err, stdout, stderr) {
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
  )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy "F:/png negro/drive/temp/optmized/${chatId}/${fileName.replace(
    ext,
    format
  )}"
    `
  console.log(fee)

  return new Promise((fin, reject) => {
    const dir = exec(
      `ffmpeg -i "${resolve(
        'downloads/' + fileName
      )}" -c:v ${code} -global_quality ${quality} -preset ${preset} -c:s copy -map_chapters 0 -map 0 -c:a copy  "F:/png negro/drive/temp/optmized/${chatId}/${fileName.replace(
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
        path: `F:/png negro/drive/temp/optmized/${chatId}/${fileName.replace(
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

  const filePath = `F:/png negro/drive/temp/optmized/${chatId}/${fileName.replace(
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
          '24',
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
          '23',
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
  message: LocalMessage,
  index: number
) {
  return new Promise(async (resolver, rejct) => {
    if (message.media) {
      try {
        const taskId = createId()
        const { media } = message
       console.log('media', media)
        const {
          duration,
          width,
          height,
          fileSize,
          fileName,
          fileId,
          uniqueFileId
        } = media


        const name = fileName
          ? `${fileName.replace(extname(fileName), '')}_${fileSize}${extname(
              fileName
            ).toLowerCase()}`
          : `${fileId.toString()}.mp3`
 
     
          console.log('descargando', index, name, fileSize, fileId.toString())
          if (!existsSync(resolve('direct-downloads', name))) {
            await tg.downloadToFile(resolve('direct-downloads', name), fileId)
          }
        
          resolver({ status: 'finish' })

      } catch (error: any) {
        console.log('ERROR', index)
        console.log(error)
        resolver({ status: 'error' })
      }
    }
  })
}

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
