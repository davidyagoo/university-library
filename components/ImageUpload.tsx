import config from '@/lib/config'
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
  UploadResponse,
} from '@imagekit/next'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'

const {
  env: { apiEndpoint },
} = config

const authenticator = async () => {
  try {
    const response = await fetch(`${apiEndpoint}/api/auth/imagekit`)

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`,
      )
    }

    const data = await response.json()
    return data
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Request failed: ${message}`)
  }
}

interface Props {
  placeholder: string
  onFileChange: (filePath: string) => void
}

const ImageUpload = ({ placeholder, onFileChange }: Props) => {
  const ikUploadRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<UploadResponse | null>(null)

  const handleUpload = async () => {
    // Access the file input element using the ref
    const fileInput = ikUploadRef.current
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      toast.warning('Please select a file to upload')
      return
    }

    // Extract the first file from the file input
    const file = fileInput.files[0]

    // Retrieve authentication parameters for the upload.
    let authParams
    try {
      authParams = await authenticator()
    } catch (authError) {
      toast.error(`Failed to authenticate for upload: ${authError}`)
      return
    }
    const { signature, expire, token, publicKey } = authParams

    console.log(authParams)

    // Call the ImageKit SDK upload function with the required parameters and callbacks.
    try {
      const uploadResponse = await upload({
        // Authentication parameters
        expire,
        token,
        signature,
        publicKey,
        file,
        fileName: file.name,
      })
      toast('Image has been successfully upload.')
      setFile(uploadResponse.filePath ? uploadResponse : null)
      onFileChange(uploadResponse.url ?? '')
    } catch (error) {
      // Handle specific error types provided by the ImageKit SDK.
      if (error instanceof ImageKitAbortError) {
        toast.error('Image upload failed.', {
          description: `Upload aborted: ${error.reason}`,
        })
      } else if (error instanceof ImageKitInvalidRequestError) {
        toast.error('Image upload failed.', {
          description: `Invalid request: ${error.message}`,
        })
      } else if (error instanceof ImageKitUploadNetworkError) {
        toast.error('Image upload failed.', {
          description: `Network error: ${error.message}`,
        })
      } else if (error instanceof ImageKitServerError) {
        toast.error('Image upload failed.', {
          description: `Server error: ${error.message}`,
        })
      } else {
        // Handle any other errors that may occur.
        toast.error('Image upload failed.', {
          description: `Upload error: ${error}`,
        })
      }
    }
  }

  return (
    <div>
      <input type="file" ref={ikUploadRef} hidden onChange={handleUpload} />
      <button
        className="upload-btn"
        onClick={(e) => {
          e.preventDefault()

          if (ikUploadRef.current) {
            ikUploadRef.current?.click()
          }
        }}
      >
        <Image
          src="/icons/upload.svg"
          alt="upload-icon"
          width={20}
          height={20}
          className="object-contain"
        />
        <p className="text-base text-light-100">{placeholder}</p>

        {file && <p className="upload-filename">{file.filePath}</p>}
      </button>

      {file && (
        <Image
          alt={file.filePath ?? ''}
          src={file.url ?? ''}
          className="aspect-5/3 object-contain"
          width={500}
          height={300}
        />
      )}
    </div>
  )
}

export default ImageUpload
