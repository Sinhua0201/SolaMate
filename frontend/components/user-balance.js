"use client";

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Display SOL balance
 */
function BalanceDisplay({ publicKey, connection }) {
  const [balance, setBalance] = useState("Loading...");

  useEffect(() => {
    async function loadBalance() {
      try {
        const bal = await connection.getBalance(publicKey)
        setBalance((bal / LAMPORTS_PER_SOL).toFixed(4))
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0.0000");
      }
    }
    
    loadBalance();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  return (
    <div className="flex justify-between items-center">
      <span className="text-neutral-400">SOL</span>
      <span className="font-medium text-neutral-200">{balance}</span>
    </div>
  );
}

/**
 * User Balance Component
 * Displays wallet address and SOL balance when wallet is connected
 */
export function UserBalance() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  // Only show when wallet is connected
  if (!connected || !publicKey) {
    return null;
  }

  const address = publicKey.toString();

  return (
    <Card className="w-full max-w-md mx-auto mb-8 bg-neutral-900/50 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-neutral-200">Account Balance</CardTitle>
        <div className="pt-2">
          <div className="text-xs text-neutral-500">Wallet</div>
          <p className="text-sm text-neutral-300 font-mono truncate pt-1">{address}</p>
          <a 
            href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View on Solana Explorer →
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <div className="text-xs text-neutral-500 mb-2">Token Balances</div>
          <BalanceDisplay 
            publicKey={publicKey} 
            connection={connection}
          />
        </div>
      </CardContent>
    </Card>
  );
}
