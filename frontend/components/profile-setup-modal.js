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
import { useInitializeProfile } from "@/lib/solana/hooks/useSocialProgram"
import { toast } from "sonner"

// 10 preset avatars - store only the filename
const AVATAR_NAMES = Array.from({ length: 10 }, (_, i) => `${i + 1}.png`)
const getAvatarPath = (name) => name ? `/avatar/${name}` : null

/**
 * Profile Setup Modal
 * Shows on first wallet connection to collect username and avatar
 * Features a rotating avatar carousel for selection
 * Now saves to Solana blockchain instead of Firebase
 */
export function ProfileSetupModal({ isOpen, onClose, onProfileCreated }) {
  const { publicKey } = useWallet()
  const { initializeProfile, isLoading: isInitializing } = useInitializeProfile()
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

  // Handle form submission - now saves to Solana blockchain
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
      const avatar = AVATAR_NAMES[selectedAvatarIndex]
      const result = await initializeProfile(username, avatar)

      if (result.success) {
        // 创建 profile 对象返回给父组件
        const profile = {
          walletAddress,
          username: username.toLowerCase(),
          displayName: username,
          avatar,
        }
        toast.success('🎉 Profile created!', {
          description: `Welcome to SolaMate, ${username}!`,
        })
        onProfileCreated(profile)
        onClose()
      } else {
        setError(result.error || 'Failed to create profile on blockchain')
        toast.error('Failed to create profile', {
          description: result.error || 'Please try again',
        })
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
      <DialogContent className="sm:max-w-md glass-modal rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-neutral-800">Welcome to SolaMate! 👋</DialogTitle>
          <DialogDescription className="text-neutral-500">
            Set up your profile so others can find and send you SOL easily
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Avatar Carousel with 3D Rotation Effect */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-neutral-600 font-medium">Choose your avatar</p>
            
            <div className="flex items-center gap-4">
              {/* Left Arrow */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prevAvatar}
                className="h-10 w-10 rounded-full glass-button hover:scale-110 ios-transition border border-neutral-200 shadow-md"
              >
                <ChevronLeft className="h-6 w-6 text-neutral-700" />
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
                      className="w-28 h-28 rounded-full border-4 border-purple-500 overflow-hidden bg-white shadow-2xl"
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
                className="h-10 w-10 rounded-full glass-button hover:scale-110 ios-transition border border-neutral-200 shadow-md"
              >
                <ChevronRight className="h-6 w-6 text-neutral-700" />
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
                      ? "bg-gradient-to-r from-purple-500 to-cyan-500 shadow-md shadow-purple-500/30"
                      : "bg-neutral-300 hover:bg-neutral-400"
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
            <label className="text-sm font-medium text-neutral-700">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sinhua_0201"
              maxLength={20}
            />
            <p className="text-xs text-neutral-400">
              3-20 characters, letters, numbers, and underscore only
            </p>
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Wallet Address
            </label>
            <Input
              value={walletAddress || ""}
              readOnly
              className="font-mono text-xs opacity-60"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isInitializing || !username.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white rounded-xl shadow-lg shadow-purple-500/20 ios-transition"
          >
            <Check className="h-4 w-4 mr-2" />
            {isSubmitting || isInitializing ? "Creating Profile on Chain..." : "Confirm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
