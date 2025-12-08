"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * Custom Solana Connect Button Component
 * Styled to match app theme with gradient effects and dark mode
 */
export function SolanaConnectButton() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    const str = address.toString();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  if (!mounted) {
    return (
      <Button
        disabled
        className="glass-button rounded-xl"
      >
        Loading...
      </Button>
    );
  }

  // Not connected - show connect button
  if (!connected && !connecting) {
    return (
      <WalletMultiButton className="!bg-gradient-to-b !from-purple-500 !to-purple-600 !backdrop-blur-xl !border !border-purple-400/30 !text-white hover:!from-purple-600 hover:!to-purple-700 !transition-all !duration-300 !rounded-xl !px-4 !py-2 !font-medium !text-sm !shadow-lg !shadow-purple-500/20">
        Connect Wallet
      </WalletMultiButton>
    );
  }

  // Connecting state
  if (connecting) {
    return (
      <Button
        disabled
        className="glass-button rounded-xl"
      >
        Connecting...
      </Button>
    );
  }

  // Connected - show account info
  return (
    <div className="flex items-center gap-2">
      {/* Network indicator */}
      <Button
        variant="ghost"
        size="sm"
        className="hidden md:flex items-center gap-2 glass rounded-xl"
        disabled
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
        <span className="text-sm text-neutral-600">Devnet</span>
      </Button>

      {/* Account button */}
      <Button
        onClick={() => disconnect()}
        className="glass-button rounded-xl ios-transition"
      >
        <span className="text-neutral-700">
          {formatAddress(publicKey)}
        </span>
      </Button>
    </div>
  );
}
