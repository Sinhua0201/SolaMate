/**
 * Create Bill - Function for AI to create split bills
 */

/**
 * Create Bill function definition for AI
 */
export const createBillFunction = {
  name: "create_bill",
  description: "Create a new bill to split expenses with friends. Use this when the user wants to split a bill, create a group expense, or share costs with others. The user should mention friends using @username.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title/reason for the bill (e.g., 'Dinner', 'Movie tickets', 'Groceries')",
      },
      amount: {
        type: "string",
        description: "Total amount in SOL to split (e.g., '2', '1.5')",
      },
      members: {
        type: "array",
        items: { type: "string" },
        description: "Array of usernames (without @) to split the bill with",
      },
    },
    required: ["title", "amount", "members"],
  },
};

/**
 * Prepare create bill action
 */
export function prepareCreateBill({ userAddress, title, amount, members, friendsList = [] }) {
  if (!userAddress) {
    return {
      success: false,
      error: "No wallet connected. Please connect your Solana wallet first.",
      needsWallet: true,
    };
  }

  const errors = [];
  const missing = [];

  if (!title) missing.push("title/reason");
  if (!amount) missing.push("amount");
  if (!members || members.length === 0) missing.push("members (use @username to mention friends)");

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

  // Validate members exist in friends list
  const resolvedMembers = [];
  const notFound = [];

  for (const username of members) {
    const friend = friendsList.find(f => 
      f.username?.toLowerCase() === username.toLowerCase()
    );
    if (friend) {
      resolvedMembers.push(friend);
    } else {
      notFound.push(username);
    }
  }

  if (notFound.length > 0) {
    errors.push(`Could not find users: @${notFound.join(", @")}. Make sure they are in your friends list.`);
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join(". "),
      errors,
    };
  }

  const perPerson = (numAmount / resolvedMembers.length).toFixed(4);

  return {
    success: true,
    type: "create_bill",
    userAddress,
    title,
    amount,
    members: resolvedMembers,
    perPerson,
    status: "pending_confirmation",
    message: `Ready to create bill "${title}" for ${amount} SOL, split with ${resolvedMembers.map(m => '@' + m.username).join(', ')} (${perPerson} SOL each)`,
  };
}
