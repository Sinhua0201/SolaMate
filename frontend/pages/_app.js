import "@/styles/globals.css";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { NotificationProvider } from "@/components/notification-toast";
import { ProfileProvider } from "@/components/profile-provider";
import { ExpenseOnboardingModal } from "@/components/expense-onboarding-modal";
import { Toaster } from "sonner";
import { useEffect } from "react";

/**
 * Main App Component
 * Wraps all pages with providers for Solana blockchain integration, notifications, and user profiles
 */
export default function App({ Component, pageProps }) {
  // Global error handler to suppress wallet rejection errors in dev mode
  useEffect(() => {
    const handleError = (event) => {
      const message = event.message?.toLowerCase() || '';
      const reason = event.reason?.message?.toLowerCase() || '';

      // Suppress wallet rejection errors
      if (
        message.includes('user rejected') ||
        message.includes('rejected') ||
        reason.includes('user rejected') ||
        reason.includes('rejected') ||
        event.error?.name === 'WalletSendTransactionError'
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event) => {
      const message = event.reason?.message?.toLowerCase() || '';

      // Suppress wallet rejection errors
      if (
        message.includes('user rejected') ||
        message.includes('rejected')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
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
          />
        </NotificationProvider>
      </ProfileProvider>
    </SolanaWalletProvider>
  );
}
