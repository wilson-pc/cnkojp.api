import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const client = new S3Client({
  endpoint: process.env.S3_URL,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_KEY??'',
    secretAccessKey: process.env.S3_SECRET??''
  }
})



const createPresignedUrlWithClient = ({key }:{key:string}) => {
    const client = new S3Client({ region:process.env.S3_REGION });
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  };

 export const uploadImage = async (key:string, data:Buffer | ReadableStream | Blob,mimeType:string):Promise<void> => {
    const params: PutObjectCommandInput = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: mimeType
      }
      const command = new PutObjectCommand(params)
      await client.send(command)
  }