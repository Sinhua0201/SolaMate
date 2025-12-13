"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from '@solana/wallet-adapter-react'
import { ProfileSetupModal } from "./profile-setup-modal"
import { getProgram } from "@/lib/solana/anchorSetup"
import { getUserProfilePDA } from "@/lib/solana/pdaHelpers"
import { useUpdateProfile } from "@/lib/solana/hooks/useSocialProgram"

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
 * Now reads from Solana blockchain instead of Firebase
 */
export function ProfileProvider({ children }) {
  const wallet = useWallet()
  const { publicKey, connected } = wallet
  const { updateProfile: updateProfileOnChain } = useUpdateProfile()
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

  // Fetch profile from Solana blockchain
  const checkProfile = async () => {
    if (!publicKey || !wallet.signTransaction) {
      return
    }

    setIsLoading(true)
    try {
      const program = getProgram(wallet)
      const [userProfilePDA] = getUserProfilePDA(publicKey)
      
      // Try to fetch the profile from blockchain
      const profileAccount = await program.account.userProfile.fetchNullable(userProfilePDA)

      if (profileAccount) {
        // Profile exists on chain
        const profileData = {
          walletAddress: profileAccount.owner.toString(),
          username: profileAccount.username,
          displayName: profileAccount.username,
          avatar: profileAccount.avatar,
          petId: profileAccount.petId,
          friendCount: profileAccount.friendCount,
          createdAt: profileAccount.createdAt.toNumber(),
        }
        setProfile(profileData)
      } else {
        // No profile exists, show setup modal
        setShowSetupModal(true)
      }
    } catch (error) {
      // RangeError 表示数据结构不匹配（新合约），需要重新创建 profile
      if (error.name === 'RangeError' || error.message?.includes('buffer length')) {
        console.log('Profile data mismatch, showing setup modal')
        setShowSetupModal(true)
      } else {
        console.error('Error checking profile from blockchain:', error)
        // 其他错误也显示设置 modal
        setShowSetupModal(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileCreated = (newProfile) => {
    setProfile(newProfile)
    setShowSetupModal(false)
  }

  // Update profile on Solana blockchain
  // If profile doesn't exist, it will show the setup modal instead
  const updateProfile = async (updates) => {
    // 如果 profile 不存在，显示设置 modal
    if (!profile) {
      setShowSetupModal(true)
      return { success: false, error: 'Please create your profile first' }
    }

    try {
      const result = await updateProfileOnChain(
        updates.username || profile?.username,
        updates.avatar || profile?.avatar
      )

      if (result.success) {
        // Update local state
        setProfile(prev => ({
          ...prev,
          ...updates,
          displayName: updates.username || prev?.displayName,
        }))
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      // 如果是 AccountNotInitialized 错误，显示设置 modal
      if (error.message?.includes('AccountNotInitialized')) {
        setShowSetupModal(true)
        return { success: false, error: 'Please create your profile first' }
      }
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
