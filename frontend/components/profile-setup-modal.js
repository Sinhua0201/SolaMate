"use client"

import { useState, useRef } from "react"
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar } from "@/components/ui/avatar"
import { Upload, User } from "lucide-react"

/**
 * Profile Setup Modal
 * Shows on first wallet connection to collect username and avatar
 */
export function ProfileSetupModal({ isOpen, onClose, onProfileCreated }) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  const walletAddress = publicKey?.toString()

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file")
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result
      setAvatar(base64String)
      setAvatarPreview(base64String)
      setError("")
    }
    reader.readAsDataURL(file)
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!username.trim()) {
      setError("Username is required")
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 characters (letters, numbers, underscore only)")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          username,
          avatar,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onProfileCreated(data.profile)
        onClose()
      } else {
        setError(data.error || 'Failed to create profile')
      }
    } catch (error) {
      console.error('Profile creation error:', error)
      setError('Failed to create profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to SolaMate! 👋</DialogTitle>
          <DialogDescription>
            Set up your profile so others can find and send you SOL easily
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center cursor-pointer hover:border-neutral-600 transition-colors overflow-hidden"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-neutral-500" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-neutral-800 border-neutral-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Avatar
            </Button>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sinhua_0201"
              className="bg-neutral-800 border-neutral-700 text-white"
              maxLength={20}
            />
            <p className="text-xs text-neutral-500">
              3-20 characters, letters, numbers, and underscore only
            </p>
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Wallet Address
            </label>
            <Input
              value={walletAddress || ""}
              readOnly
              className="bg-neutral-900 border-neutral-700 text-neutral-400 font-mono text-xs"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
          >
            {isSubmitting ? "Creating Profile..." : "Create Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
