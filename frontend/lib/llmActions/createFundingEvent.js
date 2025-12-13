/**
 * Create Funding Event - Function for AI to create funding events
 */

/**
 * Create Funding Event function definition for AI
 */
export const createFundingEventFunction = {
  name: "create_funding_event",
  description: "Create a new funding event/pool that others can apply to for funding. Use this when the user wants to create a fund, start a funding event, or set up a funding pool.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title/name of the funding event (e.g., 'Community Scholarship Fund', 'Hackathon Prize Pool')",
      },
      description: {
        type: "string",
        description: "Description of the funding event and how funds will be used",
      },
      amount: {
        type: "string",
        description: "Total amount of SOL for the funding pool (e.g., '10', '5.5')",
      },
      deadline: {
        type: "string",
        description: "Deadline date for applications in YYYY-MM-DD format",
      },
    },
    required: ["title", "amount", "deadline"],
  },
};

/**
 * Prepare create funding event action
 */
export function prepareCreateFundingEvent({ userAddress, title, description, amount, deadline }) {
  if (!userAddress) {
    return {
      success: false,
      error: "No wallet connected. Please connect your Solana wallet first.",
      needsWallet: true,
    };
  }

  const errors = [];
  const missing = [];

  if (!title) missing.push("title");
  if (!amount) missing.push("amount");
  if (!deadline) missing.push("deadline");

  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required information: ${missing.join(", ")}. Please provide these details.`,
      missing,
    };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.push("Invalid amount. Must be a positive number");
  }

  // Validate deadline format
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    errors.push("Invalid deadline format. Use YYYY-MM-DD");
  } else if (deadlineDate <= new Date()) {
    errors.push("Deadline must be in the future");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join(". "),
      errors,
    };
  }

  return {
    success: true,
    type: "create_funding_event",
    userAddress,
    title,
    description: description || "",
    amount,
    deadline,
    status: "pending_confirmation",
    message: `Ready to create funding event "${title}" with ${amount} SOL pool, deadline: ${deadline}`,
  };
}
