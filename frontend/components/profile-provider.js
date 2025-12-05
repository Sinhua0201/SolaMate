"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from '@solana/wallet-adapter-react'
import { ProfileSetupModal } from "./profile-setup-modal"

const ProfileContext = createContext()

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider")
  }
  return context
}

/**
 * Profile Provider
 * Manages user profile state and shows setup modal on first connection
 */
export function ProfileProvider({ children }) {
  const { publicKey, connected } = useWallet()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)

  const walletAddress = publicKey?.toString()

  // Check if profile exists when wallet connects
  useEffect(() => {
    if (!connected || !walletAddress) {
      setProfile(null)
      return
    }

    checkProfile()
  }, [connected, walletAddress])

  const checkProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/profile?walletAddress=${walletAddress}`)
      const data = await response.json()

      if (data.success && data.exists) {
        // Check if wallet address needs to be updated (case-sensitive fix)
        if (data.profile.walletAddress !== walletAddress) {
          console.log('Fixing wallet address case...')
          // Update profile with correct wallet address
          await updateProfile({
            username: data.profile.displayName || data.profile.username,
            avatar: data.profile.avatar
          })
        } else {
          setProfile(data.profile)
        }
      } else {
        // No profile exists, show setup modal
        setShowSetupModal(true)
      }
    } catch (error) {
      console.error('Error checking profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileCreated = (newProfile) => {
    setProfile(newProfile)
    setShowSetupModal(false)
  }

  const updateProfile = async (updates) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...updates,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setProfile(data.profile)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: 'Failed to update profile' }
    }
  }

  return (
    <ProfileContext.Provider value={{ profile, isLoading, updateProfile, checkProfile }}>
      {children}
      <ProfileSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onProfileCreated={handleProfileCreated}
      />
    </ProfileContext.Provider>
  )
}
