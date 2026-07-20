import aiApi from "./aiApi.js";

/**
 * Send a message to the AI Career Coach
 * @param {string} message
 * @returns {Promise<object>}
 */
export async function sendChatMessage(message) {
  const response = await aiApi.post("/agent/chat", { message });
  return response.data;
}

/**
 * Fetch all chat history for the current user
 * @returns {Promise<object>}
 */
export async function getChatHistory() {
  const response = await aiApi.get("/agent/chat/history");
  return response.data;
}
