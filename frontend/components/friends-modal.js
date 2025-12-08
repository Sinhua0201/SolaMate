"use client"

import { useState } from "react"
import { useRouter } from "next/router"
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { UserPlus, Check, X, MessageCircle, User, Copy } from "lucide-react"
import { useSendFriendRequest, useAcceptFriendRequest } from "@/lib/solana/hooks/useSocialProgram"
import { useFriendsCache } from "@/hooks/useFriendsCache"
import { toast } from "sonner"

// Helper to get avatar path from filename
const getAvatarPath = (name) => name ? `/avatar/${name}` : null

/**
 * Friends Modal Component
 * 好友管理弹窗 - 添加好友、查看好友列表、接受请求
 */
export function FriendsModal({ isOpen, onClose }) {
  const router = useRouter()
  const { publicKey, connected, sendTransaction } = useWallet()
  const [friendAddress, setFriendAddress] = useState("")
  const [error, setError] = useState("")
  const [copiedAddress, setCopiedAddress] = useState(null)

  const { sendFriendRequest, isLoading: isSending } = useSendFriendRequest()
  const { acceptFriendRequest, isLoading: isAccepting } = useAcceptFriendRequest()

  // 使用共享缓存的好友数据
  const { friends, pendingRequests, isLoading, refresh, isIdle, resetActivity } = useFriendsCache()

  const userAddress = publicKey?.toString()

  // 复制地址到剪贴板
  const copyAddress = (address) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  // 打开聊天
  const openChat = (friend) => {
    // 保存选中的聊天到 localStorage
    localStorage.setItem('selectedChat', JSON.stringify({
      id: friend.address,
      name: friend.displayName,
      username: friend.username,
      avatar: friend.avatar,
      type: 'friend',
    }))

    // 关闭弹窗并跳转到聊天页面
    onClose()
    router.push('/chat')
  }



  // 发送好友请求
  const handleSendRequest = async () => {
    if (!friendAddress) {
      setError('Please enter a wallet address')
      return
    }

    setError("")

    try {
      const friendPubkey = new PublicKey(friendAddress)

      // 检查是否是自己
      if (friendPubkey.toString() === userAddress) {
        setError("You can't add yourself as a friend")
        return
      }

      const result = await sendFriendRequest(friendPubkey)

      if (result.success) {
        setFriendAddress("")
        refresh() // WebSocket 会自动更新，但手动刷新确保立即显示
        toast.success('👋 Friend request sent!', {
          description: 'Waiting for them to accept',
        })
      } else {
        setError(result.error || 'Failed to send friend request')
      }
    } catch (err) {
      setError('Invalid wallet address')
    }
  }

  // 接受好友请求
  const handleAcceptRequest = async (friendAddr) => {
    try {
      const friendPubkey = new PublicKey(friendAddr)
      const result = await acceptFriendRequest(friendPubkey)

      if (result.success) {
        refresh() // WebSocket 会自动更新，但手动刷新确保立即显示
        toast.success('🎉 Friend request accepted!', {
          description: 'You are now friends',
        })
      } else {
        // 显示更友好的错误信息
        if (result.error && result.error.includes('对方还没有初始化账户')) {
          setError('对方需要先连接钱包并初始化账户。请让对方访问网站并连接钱包。')
        } else {
          setError(result.error || 'Failed to accept friend request')
        }
      }
    } catch (err) {
      console.error('Accept request error:', err)
      if (err.message && err.message.includes('对方还没有初始化账户')) {
        setError('对方需要先连接钱包并初始化账户。请让对方访问网站并连接钱包。')
      } else {
        setError('Failed to accept friend request: ' + (err.message || 'Unknown error'))
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] mx-auto p-4 sm:p-6 glass-modal rounded-3xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2 text-neutral-800">
            <UserPlus className="h-5 w-5" />
            Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 glass-scroll">
          {/* Idle Warning Banner */}
          {isIdle && (
            <div className="p-3 bg-yellow-900/20 border-2 border-yellow-600/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">😴</span>
                  <div>
                    <p className="text-xs font-semibold text-yellow-400">Updates Paused</p>
                    <p className="text-xs text-yellow-300/80">No activity for 1 minute</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    resetActivity();
                    refresh();
                  }}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white h-8"
                >
                  🔄 Refresh
                </Button>
              </div>
            </div>
          )}

          {/* 添加好友 */}
          <Card className="glass-card p-4 rounded-2xl">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">Add Friend</h3>
            <div className="flex gap-2">
              <Input
                value={friendAddress}
                onChange={(e) => setFriendAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="glass-input text-white text-sm rounded-xl"
              />
              <Button
                onClick={handleSendRequest}
                disabled={isSending || !friendAddress}
                className="glass-button bg-blue-500/30 hover:bg-blue-500/50 text-white whitespace-nowrap rounded-xl border-blue-400/30"
              >
                {isSending ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </Card>

          {/* 待处理请求 */}
          {pendingRequests.length > 0 && (
            <Card className="glass-card p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Pending Requests ({pendingRequests.length})
              </h3>
              <ScrollArea className="max-h-40 glass-scroll">
                <div className="space-y-2">
                  {pendingRequests.map((friend) => (
                    <div
                      key={friend.address}
                      className="flex items-center justify-between p-3 bg-white/60 rounded-xl ios-transition hover:bg-white/80 border border-black/5 shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
                          {friend.avatar ? (
                            <img src={getAvatarPath(friend.avatar)} alt={friend.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800">
                            {friend.displayName}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-500">
                              @{friend.username}
                            </p>
                            <span className="text-neutral-300">•</span>
                            <button
                              onClick={() => copyAddress(friend.address)}
                              className="text-xs text-neutral-400 hover:text-purple-600 transition-colors flex items-center gap-1 group"
                              title="Copy address"
                            >
                              <span className="truncate max-w-[80px]">
                                {friend.address.slice(0, 4)}...{friend.address.slice(-4)}
                              </span>
                              {copiedAddress === friend.address ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(friend.address)}
                          disabled={isAccepting}
                          className="bg-green-500 hover:bg-green-600 text-white h-8 px-3 rounded-xl shadow-md"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 h-8 px-3 rounded-xl"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* 好友列表 */}
          <Card className="glass-card p-4 rounded-2xl">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">
              My Friends ({friends.length})
            </h3>

            {isLoading ? (
              <p className="text-center text-neutral-400 py-8">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-center text-neutral-400 py-8">
                No friends yet. Add some friends to get started!
              </p>
            ) : (
              <ScrollArea className="h-[400px] glass-scroll">
                <div className="space-y-2 pr-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.address}
                      className="flex items-center justify-between p-3 bg-white/60 rounded-xl ios-transition hover:bg-white/80 border border-black/5 shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
                          {friend.avatar ? (
                            <img src={getAvatarPath(friend.avatar)} alt={friend.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800">
                            {friend.displayName}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-500">
                              @{friend.username}
                            </p>
                            <span className="text-neutral-300">•</span>
                            <button
                              onClick={() => copyAddress(friend.address)}
                              className="text-xs text-neutral-400 hover:text-purple-600 transition-colors flex items-center gap-1 group"
                              title="Copy address"
                            >
                              <span className="truncate max-w-[100px]">
                                {friend.address.slice(0, 4)}...{friend.address.slice(-4)}
                              </span>
                              {copiedAddress === friend.address ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openChat(friend)}
                        className="bg-purple-500 hover:bg-purple-600 text-white h-8 flex-shrink-0 rounded-xl shadow-md"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
