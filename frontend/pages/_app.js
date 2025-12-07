import "@/styles/globals.css";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { NotificationProvider } from "@/components/notification-toast";
import { ProfileProvider } from "@/components/profile-provider";
import { ExpenseOnboardingModal } from "@/components/expense-onboarding-modal";

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
        </NotificationProvider>
      </ProfileProvider>
    </SolanaWalletProvider>
  );
}
