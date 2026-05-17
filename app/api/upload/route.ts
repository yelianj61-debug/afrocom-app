import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const folder = (formData.get('folder') as string) || 'afrotv_images'

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const resourceType = isPdf ? 'raw' : 'auto'

  return new Promise<NextResponse>((resolve) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: resourceType as 'raw' | 'auto' | 'image' | 'video',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            resolve(NextResponse.json({ error: 'Erreur Cloudinary' }, { status: 500 }))
          } else {
            resolve(NextResponse.json({ url: result.secure_url, public_id: result.public_id }))
          }
        }
      )
      .end(buffer)
  })
}
