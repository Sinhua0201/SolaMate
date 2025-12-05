/**
 * LLM Actions - Central registry for AI agent capabilities (Solana version)
 * This module exports all available functions that the AI can call
 */

import { transferSolFunction, prepareTransferSol } from "./executeSolanaTransfer";

/**
 * All available functions that the AI agent can call
 * Currently supports SOL transfers on Solana devnet
 */
export const availableFunctions = [transferSolFunction];

/**
 * Function executor - maps function names to their implementations
 */
export const functionExecutors = {
  transfer_sol: prepareTransferSol,
  // Add more function executors here as you add new capabilities
};

/**
 * Execute a function call from the AI
 * 
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Arguments for the function
 * @param {string} userAddress - The connected wallet address (if any)
 * @returns {Object} - Result of the function execution
 */
export function executeFunction(functionName, args, userAddress = null) {
  const executor = functionExecutors[functionName];
  
  if (!executor) {
    return {
      success: false,
      error: `Unknown function: ${functionName}`,
    };
  }
  
  try {
    // Add userAddress to args if provided
    const fullArgs = userAddress ? { ...args, userAddress } : args;
    return executor(fullArgs);
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to execute function",
    };
  }
}

// Re-export for convenience
export { transferSolFunction, prepareTransferSol };
