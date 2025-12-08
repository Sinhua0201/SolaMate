"use client"

import { useState } from "react"
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
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// 10 preset avatars - store only the filename
const AVATAR_NAMES = Array.from({ length: 10 }, (_, i) => `${i + 1}.png`)
const getAvatarPath = (name) => name ? `/avatar/${name}` : null

/**
 * Profile Setup Modal
 * Shows on first wallet connection to collect username and avatar
 * Features a rotating avatar carousel for selection
 */
export function ProfileSetupModal({ isOpen, onClose, onProfileCreated }) {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState("")
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [direction, setDirection] = useState(0) // -1 for left, 1 for right

  const walletAddress = publicKey?.toString()

  // Navigate to previous avatar
  const prevAvatar = () => {
    setDirection(-1)
    setSelectedAvatarIndex((prev) => (prev - 1 + AVATAR_NAMES.length) % AVATAR_NAMES.length)
  }

  // Navigate to next avatar
  const nextAvatar = () => {
    setDirection(1)
    setSelectedAvatarIndex((prev) => (prev + 1) % AVATAR_NAMES.length)
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
          avatar: AVATAR_NAMES[selectedAvatarIndex], // Save only filename like "1.png"
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
          {/* Avatar Carousel with 3D Rotation Effect */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-neutral-400">Choose your avatar</p>
            
            <div className="flex items-center gap-4">
              {/* Left Arrow */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prevAvatar}
                className="h-10 w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 hover:scale-110 transition-transform"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              {/* Avatar Display with 3D Rotation */}
              <div className="relative w-32 h-32 flex items-center justify-center" style={{ perspective: "600px" }}>
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={selectedAvatarIndex}
                    custom={direction}
                    initial={{ 
                      rotateY: direction > 0 ? 90 : -90, 
                      opacity: 0, 
                      scale: 0.5,
                    }}
                    animate={{ 
                      rotateY: 0, 
                      opacity: 1, 
                      scale: 1,
                    }}
                    exit={{ 
                      rotateY: direction < 0 ? 90 : -90, 
                      opacity: 0, 
                      scale: 0.5,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      duration: 0.5,
                    }}
                    className="absolute"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <motion.div 
                      className="w-28 h-28 rounded-full border-4 border-purple-500 overflow-hidden bg-neutral-800 shadow-2xl"
                      animate={{
                        boxShadow: [
                          "0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)",
                          "0 0 30px rgba(6, 182, 212, 0.4), 0 0 60px rgba(6, 182, 212, 0.2)",
                          "0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)",
                        ],
                        borderColor: ["#a855f7", "#06b6d4", "#a855f7"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <img
                        src={getAvatarPath(AVATAR_NAMES[selectedAvatarIndex])}
                        alt={`Avatar ${selectedAvatarIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right Arrow */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={nextAvatar}
                className="h-10 w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 hover:scale-110 transition-transform"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Avatar Indicator Dots */}
            <div className="flex gap-2 mt-2">
              {AVATAR_NAMES.map((_, index) => (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => {
                    setDirection(index > selectedAvatarIndex ? 1 : -1)
                    setSelectedAvatarIndex(index)
                  }}
                  className={`rounded-full transition-all ${
                    index === selectedAvatarIndex
                      ? "bg-gradient-to-r from-purple-500 to-cyan-500"
                      : "bg-neutral-600 hover:bg-neutral-500"
                  }`}
                  animate={{
                    width: index === selectedAvatarIndex ? 20 : 8,
                    height: 8,
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            <p className="text-xs text-neutral-500">
              Avatar {selectedAvatarIndex + 1} of {AVATAR_NAMES.length}
            </p>
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

          {/* Confirm Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
          >
            <Check className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating Profile..." : "Confirm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
