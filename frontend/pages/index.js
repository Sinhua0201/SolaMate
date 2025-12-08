import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { ChatDemo } from "@/components/chat-demo";
import { AuroraText } from "@/components/ui/aurora-text";

/**
 * SolaMate Landing Page
 * Mobile-first design optimized for iPhone 13 Pro Max (428x926px)
 * Demonstrates SolaMate chatbot interface for crypto transactions
 * PWA ready for iOS
 */
export default function Home() {
  return (
    <div className="font-sans h-[100svh] overflow-hidden overscroll-none md:min-h-screen md:overflow-visible">
      {/* Mobile-optimized Layout with Liquid Glass Effect - WHITE THEME */}
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-purple-50 antialiased relative overflow-hidden md:overflow-visible">
        {/* Animated gradient background */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent pointer-events-none" />
        
        {/* Navbar with wallet connection */}
        <Navbar />
        
        {/* Spotlight effect - animated background */}
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        
        {/* Main Content Container - Mobile optimized with safe padding */}
        <div className="flex-1 flex flex-col px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto relative z-10 w-full overflow-hidden safe-area-inset">
          
          {/* Header Section - Compact for mobile */}
          <div className="mb-6 mt-8 md:mt-12">
            {/* Main heading with gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-4"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 bg-[length:200%_auto] animate-gradient">Transfers made </span>
                <AuroraText colors={["#7c3aed", "#06b6d4", "#ec4899", "#7c3aed"]} speed={1.5}>easy</AuroraText>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800">.</span>
              </h1>
            </motion.div>

          </div>

          {/* LeftAI Demo - Main Feature - Mobile optimized */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 min-h-0 flex items-start justify-center w-full overflow-visible"
          >
            <ChatDemo />
          </motion.div>


          {/* Footer - Hidden on mobile, visible on desktop */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-neutral-500 text-xs text-center mt-6 pb-4 hidden md:block"
          >
            <p>© 2025 SolaMate. All rights reserved.</p>
          </motion.footer>
        </div>
      </div>
    </div>
  );
}
