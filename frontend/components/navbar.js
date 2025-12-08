"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/router"
import { useState, useEffect } from "react"
import { Menu, Wallet, Copy, Check, User, Edit, Users } from "lucide-react"
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SolanaConnectButton } from "@/components/solana-connect-button"
import { NotificationBell } from "@/components/notification-bell"
import { useProfile } from "@/components/profile-provider"
import { FriendsModal } from "@/components/friends-modal"

// Navigation links for the app
const navLinks = [
  { name: "Home", href: "/" },
  { name: "Chat", href: "/chat" },
  { name: "Pets", href: "/pets" },
  { name: "Expenses", href: "/expenses" },
]



/**
 * Navbar Component for Solana
 * Sticky navigation bar with Solana wallet connection and mobile menu
 */
export function Navbar() {
  const router = useRouter()
  const [pathname, setPathname] = useState("")
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [balance, setBalance] = useState(0)

  // Edit profile state
  const [editUsername, setEditUsername] = useState("")
  const [editAvatar, setEditAvatar] = useState(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState("")

  // Solana wallet hooks
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()

  // Profile hook
  const { profile, updateProfile } = useProfile()

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isProfileOpen) {
      setIsEditMode(false)
      setUpdateError("")
    }
  }, [isProfileOpen])

  // Fetch SOL balance (with debounce to avoid rate limiting)
  useEffect(() => {
    if (publicKey && connected) {
      // 延迟加载余额，避免立即请求
      const timer = setTimeout(() => {
        connection.getBalance(publicKey).then((bal) => {
          setBalance(bal / LAMPORTS_PER_SOL)
        }).catch((err) => {
          console.error('Error fetching balance:', err)
          // 如果失败，不显示错误，只是不更新余额
        })
      }, 500) // 延迟 500ms

      return () => clearTimeout(timer)
    } else {
      setBalance(0)
    }
  }, [publicKey, connected])

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "Not connected"
    const str = address.toString()
    return `${str.slice(0, 6)}...${str.slice(-4)}`
  }

  const userData = {
    address: formatAddress(publicKey),
    fullAddress: publicKey?.toString() || "",
    balances: {
      SOL: balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    }
  }

  // Set pathname on client side only
  useEffect(() => {
    setPathname(router.pathname)
  }, [router.pathname])

  // Copy wallet address to clipboard
  const copyAddress = () => {
    if (userData.fullAddress) {
      navigator.clipboard.writeText(userData.fullAddress)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/50 bg-black/90 backdrop-blur-md supports-[backdrop-filter]:bg-black/70">
      <div className="container flex h-14 md:h-16 max-w-screen-2xl items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-neutral-950 border-neutral-800/50">
              <div className="flex items-center gap-1 mb-8">
                <Image
                  src="/favicon.ico"
                  alt="SolaMate Logo"
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
                <span className="font-bold text-lg text-neutral-100">
                  SolaMate
                </span>
              </div>
              {/* Mobile navigation links */}
              <nav className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 text-base font-medium transition-colors px-3 py-2 rounded-lg ${pathname === link.href
                        ? "text-neutral-100 bg-neutral-800/50"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30"
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <Image
              src="/favicon.ico"
              alt="SolaMate Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-bold text-xl text-neutral-100">
              SolaMate
            </span>
          </Link>
        </div>

        {/* Mobile - Top Right Actions */}
        <div className="md:hidden flex items-center gap-2">
          {connected ? (
            <>
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFriendsOpen(true)}
                className="bg-neutral-900/50 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <Users className="h-4 w-4 mr-1" />
                Friends
              </Button>
              {/* Profile Avatar Button - Mobile */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity border-2 border-neutral-700"
              >
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </button>
            </>
          ) : (
            <SolanaConnectButton />
          )}
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${pathname === link.href
                  ? "text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200"
                }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="flex items-center gap-3">
            {connected && (
              <>
                <NotificationBell />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFriendsOpen(true)}
                  className="bg-neutral-900/50 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Friends
                </Button>
                {/* Profile Avatar Button */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity border-2 border-neutral-700"
                >
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </button>
              </>
            )}
            <SolanaConnectButton />
          </div>
        </nav>
      </div>

      {/* Friends Modal */}
      <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />

      {/* Old Balance Modal - Removed */}
      <Dialog open={false} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md w-[92vw] mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">Account Balance</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2">
            {/* Wallet Information Section */}
            <div className="space-y-2 mb-6">
              <div className="p-3 sm:p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-neutral-400">Wallet</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-6 w-6 p-0 hover:bg-neutral-700"
                  >
                    {copiedAddress ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-neutral-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs sm:text-sm font-medium text-neutral-100 font-mono break-all mb-2">{userData.fullAddress}</p>
                <a
                  href={`https://explorer.solana.com/address/${userData.fullAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 inline-block"
                >
                  View on Solana Explorer →
                </a>
              </div>
            </div>

            {/* Token Balances Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
                Token Balances
              </h3>

              {/* SOL Balance */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-neutral-800/80 rounded-xl border-2 border-neutral-700 shadow-lg hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 border border-neutral-600 shadow-md">
                    <span className="text-white font-bold text-sm">SOL</span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-neutral-50">SOL</p>
                    <p className="text-[10px] sm:text-xs text-neutral-400">Solana</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base sm:text-xl font-bold text-neutral-50">{userData.balances.SOL}</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400">Devnet</p>
                </div>
              </div>
            </div>

            {/* Total Balance */}
            <div className="pt-2 sm:pt-3 border-t border-neutral-700">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-neutral-800/80 rounded-lg">
                <span className="text-sm sm:text-base font-medium text-neutral-300">Total Balance</span>
                <span className="text-lg sm:text-xl font-bold text-neutral-100">
                  {userData.balances.SOL} SOL
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Avatar - View or Edit Mode */}
            {isEditMode ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border-4 border-neutral-700 relative group"
                >
                  {(editAvatarPreview || profile?.avatar) ? (
                    <>
                      <img
                        src={editAvatarPreview || profile?.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <User className="h-12 w-12 text-white" />
                  )}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (!file) return

                    if (file.size > 2 * 1024 * 1024) {
                      setUpdateError("Image must be less than 2MB")
                      return
                    }

                    if (!file.type.startsWith('image/')) {
                      setUpdateError("Please upload an image file")
                      return
                    }

                    const reader = new FileReader()
                    reader.onloadend = () => {
                      const base64String = reader.result
                      setEditAvatar(base64String)
                      setEditAvatarPreview(base64String)
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="hidden"
                />
                <p className="text-xs text-neutral-400">Click avatar to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center overflow-hidden border-4 border-neutral-700">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-white" />
                  )}
                </div>

                {/* Username - View Mode */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white">
                    {profile?.displayName || profile?.username || 'Anonymous'}
                  </h3>
                  <p className="text-sm text-neutral-400">@{profile?.username || 'no_username'}</p>
                </div>
              </div>
            )}

            {/* Username Input - Edit Mode Only */}
            {isEditMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={20}
                />
                <p className="text-xs text-neutral-400">3-20 characters (letters, numbers, underscore)</p>
              </div>
            )}

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Wallet Address</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                  <p className="text-xs font-mono text-neutral-300 break-all">
                    {userData.fullAddress}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-10 w-10 p-0"
                >
                  {copiedAddress ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-neutral-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* SOL Balance */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Balance</label>
              <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">SOL</span>
                  <span className="text-lg font-bold text-white">{userData.balances.SOL}</span>
                </div>
              </div>
            </div>

            {/* View on Explorer */}
            <a
              href={`https://explorer.solana.com/address/${userData.fullAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-blue-400 hover:text-blue-300"
            >
              View on Solana Explorer →
            </a>

            {/* Error Message */}
            {updateError && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-xs text-red-400">{updateError}</p>
              </div>
            )}

            {/* Edit Profile / Save Changes Button */}
            {isEditMode ? (
              <Button
                onClick={async () => {
                  setUpdateError("")

                  if (!editUsername.trim()) {
                    setUpdateError("Username is required")
                    return
                  }

                  if (!/^[a-zA-Z0-9_]{3,20}$/.test(editUsername)) {
                    setUpdateError("Username must be 3-20 characters (letters, numbers, underscore only)")
                    return
                  }

                  setIsUpdating(true)

                  try {
                    const result = await updateProfile({
                      username: editUsername,
                      avatar: editAvatar || profile?.avatar,
                    })

                    if (result.success) {
                      setUpdateError("")
                      setIsEditMode(false)
                    } else {
                      setUpdateError(result.error || "Failed to update profile")
                    }
                  } catch (error) {
                    setUpdateError("Failed to update profile")
                  } finally {
                    setIsUpdating(false)
                  }
                }}
                disabled={isUpdating}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsEditMode(true)
                  setEditUsername(profile?.displayName || profile?.username || "")
                  setEditAvatarPreview(profile?.avatar || null)
                  setEditAvatar(null)
                  setUpdateError("")
                }}
                variant="outline"
                className="w-full bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
