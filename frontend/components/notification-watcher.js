"use client"

import { useEffect } from "react"
import { useWallet } from '@solana/wallet-adapter-react'

/**
 * Notification Watcher Component - DISABLED
 * Notification system has been disabled for performance reasons
 */
export function NotificationWatcher() {
  const { publicKey, connected } = useWallet()

  useEffect(() => {
    // Notification system disabled for performance
    // No polling, no API calls
  }, [publicKey, connected])

  // This component doesn't render anything visible
  return null
}
