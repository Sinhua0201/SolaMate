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
        className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-neutral-100 border border-neutral-700/50"
      >
        Loading...
      </Button>
    );
  }

  // Not connected - show connect button
  if (!connected && !connecting) {
    return (
      <WalletMultiButton className="!bg-gradient-to-r !from-neutral-800 !to-neutral-900 hover:!from-neutral-700 hover:!to-neutral-800 !text-neutral-100 !border !border-neutral-700/50 !backdrop-blur-sm !transition-all !duration-200 !rounded-md !px-4 !py-2 !font-medium !text-sm">
        Connect Wallet
      </WalletMultiButton>
    );
  }

  // Connecting state
  if (connecting) {
    return (
      <Button
        disabled
        className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-neutral-100 border border-neutral-700/50"
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
        className="hidden md:flex items-center gap-2 bg-neutral-900/50 hover:bg-neutral-800/50 text-neutral-300 border border-neutral-800/50 backdrop-blur-sm"
        disabled
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm">Devnet</span>
      </Button>

      {/* Account button */}
      <Button
        onClick={() => disconnect()}
        className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 text-neutral-100 border border-neutral-700/50 backdrop-blur-sm transition-all duration-200"
      >
        <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
          {formatAddress(publicKey)}
        </span>
      </Button>
    </div>
  );
}
