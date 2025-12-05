import "@/styles/globals.css";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { NotificationProvider } from "@/components/notification-toast";
import { ProfileProvider } from "@/components/profile-provider";

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
        </NotificationProvider>
      </ProfileProvider>
    </SolanaWalletProvider>
  );
}
