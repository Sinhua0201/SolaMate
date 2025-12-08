"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/components/notification-toast"

/**
 * Notification Bell Component
 * Shows a bell icon with unread count badge
 * Opens a modal with all pending payment requests
 * Polls for notifications every 5 seconds
 */
export function NotificationBell() {
  const { publicKey, connected } = useWallet()
  const { showNotification } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const userAddress = publicKey?.toString()

  // Fetch notifications for current user - DISABLED
  const fetchNotifications = async () => {
    // Notification system disabled for performance
    setNotifications([]);
    setUnreadCount(0);
    return;
  }

  // Only fetch notifications when wallet connects (not polling)
  useEffect(() => {
    if (!connected || !userAddress) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    // Fetch once when wallet connects
    fetchNotifications()
  }, [userAddress, connected])

  // No auto-refresh - only refresh when user clicks the bell button

  // Handle "Pay Now" from notification list
  const handlePayNow = (notification) => {
    // Close modal
    setIsOpen(false)
    
    // Show the notification toast with Pay Now button
    showNotification({
      id: notification.id,
      type: notification.type || 'payment_request',
      title: notification.title || 'Payment Request',
      message: notification.message,
      amount: notification.amount,
      fromName: notification.fromName,
      fromAddress: notification.from,
    })
  }

  // Handle dismiss notification - DISABLED
  const handleDismiss = async (notificationId) => {
    // Notification system disabled
    return;
  }

  // Don't show bell if not connected
  if (!connected) {
    return null
  }

  return (
    <>
      {/* Bell Button - Icon only, responsive sizing */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          fetchNotifications(); // Refresh notifications when clicked
          setIsOpen(true);
        }}
        className="relative glass-button text-neutral-600 hover:text-neutral-800 h-9 w-9 p-0 flex items-center justify-center shadow-md"
      >
        <Bell className="h-4 w-4" />
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 border-2 border-black"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[85vh] mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 text-center sm:text-left">
            <DialogTitle className="text-lg sm:text-xl flex items-center justify-center sm:justify-start gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-center sm:text-left">
              {notifications.length === 0 
                ? "You're all caught up! No pending notifications."
                : `You have ${notifications.length} pending payment request${notifications.length !== 1 ? 's' : ''}`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3 py-2 w-full">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 p-4 w-full shadow-md"
                  >
                    {/* Notification Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-800 mb-1">
                          {notification.title || 'Payment Request'}
                        </h4>
                        <p className="text-xs text-neutral-600 mb-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    {/* Amount and Details */}
                    <div className="space-y-2 mb-3 pl-13">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Amount:</span>
                        <span className="text-sm font-bold text-orange-600">
                          {notification.amount} SOL
                        </span>
                      </div>
                      {notification.description && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">For:</span>
                          <span className="text-xs text-neutral-700">
                            {notification.description}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">From:</span>
                        <span className="text-xs text-neutral-700 font-mono">
                          {notification.fromName || `${notification.from?.substring(0, 8)}...`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Time:</span>
                        <span className="text-xs text-neutral-700">
                          {new Date(notification.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pl-13">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-xs h-8 shadow-md"
                        onClick={() => handlePayNow(notification)}
                      >
                        Pay Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs h-8"
                        onClick={() => handleDismiss(notification.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-16 w-16 text-neutral-600 mb-4" />
              <p className="text-neutral-400 text-sm">No pending notifications</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
