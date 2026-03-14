import config from '@/lib/config'
import { getUploadAuthParams } from '@imagekit/next/server'
import { NextResponse } from 'next/server'

const {
  env: {
    imagekit: { publicKey, privateKey },
  },
} = config

export async function GET() {
  const { signature, expire, token } = getUploadAuthParams({
    publicKey: publicKey as string,
    privateKey: privateKey as string,
  })

  return NextResponse.json({ signature, expire, token, publicKey })
}
