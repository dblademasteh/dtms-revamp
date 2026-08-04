import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, FileUp, X } from 'lucide-react'

interface QrScannerModalProps {
  open: boolean
  onClose: () => void
  onResult: (trackingNumber: string) => void
}

const READER_ID = 'qr-reader-region'

const extractTrackingNumber = (text: string): string => {
  try {
    const url = new URL(text, window.location.origin)
    const t = url.searchParams.get('track')
    if (t?.trim()) return t.trim()
  } catch {
    // Not a URL — treat the whole string as the tracking number
  }
  return text.trim()
}

export default function QrScannerModal({ open, onClose, onResult }: QrScannerModalProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const startCamera = async () => {
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => onResult(extractTrackingNumber(decodedText)),
        () => {}
      )
      setCameraStarted(true)
    } catch (err: any) {
      setCameraError(err?.message || 'Camera is unavailable. Use the upload option instead.')
    }
  }

  const stopCamera = async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      await scanner.stop().catch(() => {})
      scanner.clear()
    }
    setCameraStarted(false)
  }

  useEffect(() => {
    if (!open) return
    if (mode === 'camera') startCamera()
    return () => {
      if (mode === 'camera') stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileError(null)
    const scanner = new Html5Qrcode(READER_ID)
    try {
      const decoded = await scanner.scanFile(file, false)
      onResult(extractTrackingNumber(decoded))
    } catch {
      setFileError('No QR code found in that image. Try a clearer, well-lit photo.')
    } finally {
      scanner.clear()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'camera'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Camera className="w-4 h-4" />
              Camera
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'upload'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileUp className="w-4 h-4" />
              Upload Image
            </button>
          </div>

          <div
            id={READER_ID}
            className={
              mode === 'camera'
                ? 'w-full rounded-xl overflow-hidden bg-slate-950 [&>video]:w-full'
                : 'hidden'
            }
          />

          {mode === 'camera' && (
            <div className="mt-3 space-y-2">
              {cameraError && <p className="text-xs text-red-600 dark:text-red-400">{cameraError}</p>}
              {cameraStarted && !cameraError && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Point your camera at a tracking QR code.
                </p>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <div className="mt-3 space-y-3">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 cursor-pointer hover:border-primary-500 transition-colors">
                <FileUp className="w-8 h-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Choose a QR code image
                </span>
                <span className="text-xs text-slate-400">JPG, PNG, or WebP</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
              {fileError && <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
