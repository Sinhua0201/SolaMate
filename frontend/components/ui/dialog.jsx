"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Dialog root component - controls open/close state
const Dialog = DialogPrimitive.Root

// Dialog trigger - what user clicks to open the dialog
const DialogTrigger = DialogPrimitive.Trigger

// Dialog portal - renders dialog in a portal (outside normal DOM hierarchy)
const DialogPortal = DialogPrimitive.Portal

// Dialog close button
const DialogClose = DialogPrimitive.Close

/**
 * Dialog Overlay - Liquid glass background behind the dialog WHITE THEME
 * Fades in/out smoothly with animation
 */
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/20 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Dialog Content - Liquid Glass modal container WHITE THEME
 * Centered on screen with smooth iOS-style animation
 * Responsive for mobile and desktop
 */
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-300",
        // Liquid Glass Effect - White Theme
        "bg-gradient-to-b from-white/98 to-white/95",
        "backdrop-blur-2xl",
        "border border-black/5",
        "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,1)]",
        "rounded-3xl",
        // Animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-right-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-right-1/2 data-[state=open]:slide-in-from-top-[48%]",
        "max-h-[90vh] overflow-y-auto glass-scroll",
        className
      )}
      {...props}
    >
      {children}
      {/* Close button - glass style */}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-black/5 hover:bg-black/10 border border-black/10 opacity-70 transition-all hover:opacity-100 hover:scale-105 focus:outline-none disabled:pointer-events-none">
        <X className="h-4 w-4 text-neutral-500" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * Dialog Header - Title and description section at top of dialog
 */
const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

/**
 * Dialog Footer - Action buttons section at bottom of dialog
 */
const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

/**
 * Dialog Title - Main heading text WHITE THEME
 */
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-neutral-800",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Dialog Description - Supporting text below title WHITE THEME
 */
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-neutral-500", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

