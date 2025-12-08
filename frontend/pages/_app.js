import "@/styles/globals.css";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { NotificationProvider } from "@/components/notification-toast";
import { ProfileProvider } from "@/components/profile-provider";
import { ExpenseOnboardingModal } from "@/components/expense-onboarding-modal";
import { Toaster } from "sonner";

/**
 * Main App Component
 * Wraps all pages with providers for Solana blockchain integration, notifications, and user profiles
 */
export default function App({ Component, pageProps }) {
  return (
    <SolanaWalletProvider>
      <ProfileProvider>
        <NotificationProvider>
          <Component {...pageProps} />
          <ExpenseOnboardingModal />
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
                padding: '16px',
                color: '#1f2937',
              },
              className: 'glass-toast',
            }}
            richColors
            expand
            closeButton
          />
        </NotificationProvider>
      </ProfileProvider>
    </SolanaWalletProvider>
  );
}
