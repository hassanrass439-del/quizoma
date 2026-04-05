'use client'

import { useCallback, useRef } from 'react'

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.google-apps.document',
].join(',')

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export function useGoogleDrivePicker(onFilePicked: (file: File) => void) {
  const onFilePickedRef = useRef(onFilePicked)
  onFilePickedRef.current = onFilePicked

  const showPicker = useCallback((token: string) => {
    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS)
    view.setMimeTypes(SUPPORTED_MIME_TYPES)

    new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback(async (data: any) => {
        if (data.action !== window.google.picker.Action.PICKED) return

        const { id: fileId, name, mimeType } = data.docs[0]

        try {
          let blob: Blob
          let fileName: string
          let fileType: string

          if (mimeType === 'application/vnd.google-apps.document') {
            const exportMime =
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            const res = await fetch(
              `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!res.ok) throw new Error('Export failed')
            blob = await res.blob()
            fileType = exportMime
            fileName = name.endsWith('.docx') ? name : `${name}.docx`
          } else {
            const res = await fetch(
              `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!res.ok) throw new Error('Download failed')
            blob = await res.blob()
            fileType = mimeType
            fileName = name
          }

          if (blob.size > MAX_SIZE) {
            alert('Fichier trop volumineux (max 10 Mo)')
            return
          }

          onFilePickedRef.current(new File([blob], fileName, { type: fileType }))
        } catch {
          alert('Erreur lors du téléchargement du fichier Drive.')
        }
      })
      .build()
      .setVisible(true)
  }, [])

  const openPicker = useCallback(async () => {
    if (!CLIENT_ID) {
      alert('Google Drive non configuré (NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant).')
      return
    }

    try {
      await loadScript('https://apis.google.com/js/api.js')
      await loadScript('https://accounts.google.com/gsi/client')

      await new Promise<void>((resolve) =>
        window.gapi.load('picker', () => resolve())
      )

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response: { access_token?: string }) => {
          if (response.access_token) showPicker(response.access_token)
        },
      })

      tokenClient.requestAccessToken({ prompt: 'select_account' })
    } catch {
      alert('Impossible de charger Google Drive.')
    }
  }, [showPicker])

  return { openPicker }
}
