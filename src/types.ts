import { TelegramClient } from "telegram"

export type Env = {
    Variables: {
    telegram:TelegramClient
    },

  }

  export type jwtPayload = {
    sub: string
    email: string
    exp: number
  }
  export type TelegramMedia = {
  fileSize: number;
  dcId: number;
  width: number;
  height: number;
  duration: number;
  isAnimation: boolean;
  isRound: boolean;
  isLegacyGif: boolean;
  hasSpoiler: boolean;
  ttlSeconds: number | null;
  videoStartTs: number | null;
  codec: string | null;
  videoCover: any | null; // You might want to define a specific type for this
  videoTimestamp: number | null;
  fileName: string | null;
  mimeType: string;
  date: string;
  thumbnails: {
    fileSize: number;
    dcId: number;
    width: number;
    height: number;
    isVideo: boolean;
    type: string;
    fileId: string;
    uniqueFileId: string;
  }[];
  fileId: string;
  uniqueFileId: string;
}