/**
 * Execute Solana Transfer - SOL transfer functionality
 * Handles validation, preparation, and blockchain execution of SOL transfers on Solana devnet
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

/**
 * Transfer SOL function definition for AI
 */
export const transferSolFunction = {
  name: "transfer_sol",
  description: "Transfer SOL tokens from the connected wallet to a destination address on Solana devnet. Use this when the user wants to send, transfer, or pay SOL to someone.",
  parameters: {
    type: "object",
    properties: {
      destinationAddress: {
        type: "string",
        description: "The recipient's Solana wallet address (base58 format). Must be a valid Solana public key.",
      },
      amount: {
        type: "string",
        description: "The amount of SOL to transfer (e.g., '0.1', '1.5'). Must be a positive number.",
      },
    },
    required: ["destinationAddress", "amount"],
  },
};

/**
 * Validate transfer parameters
 */
function validateTransferParams({ destinationAddress, amount }) {
  const errors = [];
  const missing = [];
  
  // Check for missing required parameters
  if (!destinationAddress) missing.push("destination address");
  if (!amount) missing.push("amount");
  
  if (missing.length > 0) {
    return {
      isValid: false,
      missing,
      error: `Missing required information: ${missing.join(", ")}. Please provide these details.`,
    };
  }
  
  // Validate destination address format (Solana public key)
  try {
    new PublicKey(destinationAddress);
  } catch (e) {
    errors.push("Invalid Solana address format. Must be a valid base58 public key");
  }
  
  // Validate amount
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.push("Invalid amount. Must be a positive number");
  }
  
  return {
    isValid: errors.length === 0,
    missing: [],
    errors,
    error: errors.join(". "),
  };
}

/**
 * Prepare transfer SOL action
 */
export function prepareTransferSol({ userAddress, destinationAddress, amount }) {
  // Check if wallet is connected
  if (!userAddress) {
    return {
      success: false,
      error: "No wallet connected. Please connect your Solana wallet first to make transfers.",
      needsWallet: true,
    };
  }
  
  // Validate parameters
  const validation = validateTransferParams({ destinationAddress, amount });
  
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      missing: validation.missing,
      errors: validation.errors,
      currentParams: {
        destinationAddress: destinationAddress || null,
        amount: amount || null,
      },
    };
  }
  
  // All valid - return transfer details for confirmation
  return {
    success: true,
    type: "transfer_sol",
    userAddress,
    destinationAddress,
    amount,
    status: "pending_confirmation",
    message: `Ready to transfer ${amount} SOL to ${destinationAddress}`,
  };
}

/**
 * Execute a SOL transfer on Solana devnet
 */
export async function executeSolTransfer({ 
  destinationAddress, 
  amount,
  connection,
  publicKey,
  sendTransaction
}) {
  try {
    // Convert amount to lamports (1 SOL = 1,000,000,000 lamports)
    const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
    
    // Create transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(destinationAddress),
        lamports: lamports,
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    
    // Send transaction
    const signature = await sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    return {
      success: true,
      signature,
      amount,
      destinationAddress,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
    
  } catch (error) {
    console.error('Solana transfer error:', error);
    
    // Handle user rejection
    if (error.message?.includes('User rejected') || error.code === 4001) {
      return {
        success: false,
        error: 'Transaction rejected by user',
        userRejected: true,
      };
    }
    
    // Handle insufficient funds
    if (error.message?.includes('insufficient')) {
      return {
        success: false,
        error: 'Insufficient SOL balance for this transfer',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to execute transfer',
    };
  }
}

/**
 * Get Solana explorer URL for transaction
 */
export function getSolanaExplorerUrl(signature, cluster = 'devnet') {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
