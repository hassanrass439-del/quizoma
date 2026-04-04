'use client'

import { useEffect, useState } from 'react'

/**
 * Détecte si le clavier virtuel mobile est ouvert.
 * Utilise la Visual Viewport API quand disponible.
 */
export function useMobileKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    function handleResize() {
      const viewport = window.visualViewport!
      const windowHeight = window.innerHeight
      const diff = windowHeight - viewport.height

      // Le clavier est ouvert si la différence est > 150px
      const isOpen = diff > 150
      setKeyboardOpen(isOpen)
      setKeyboardHeight(isOpen ? diff : 0)
    }

    window.visualViewport.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  return { keyboardOpen, keyboardHeight }
}
