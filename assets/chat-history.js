const CHAT_HISTORY_VERSION = 1;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;

export function sanitizeChatHistory(value) {
  const source = Array.isArray(value) ? value : value?.messages;
  if (!Array.isArray(source)) return [];

  const messages = [];
  let totalChars = 0;
  for (const entry of source.slice(-MAX_MESSAGES).reverse()) {
    if (!entry || !['visitor', 'bot'].includes(entry.role) || typeof entry.text !== 'string') continue;
    const text = entry.text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text || totalChars + text.length > MAX_TOTAL_CHARS) continue;
    messages.push({ role: entry.role, text });
    totalChars += text.length;
  }
  return messages.reverse();
}

export function readChatHistory(storage, key) {
  if (!storage || !key) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? 'null');
    if (parsed?.version !== CHAT_HISTORY_VERSION) return [];
    return sanitizeChatHistory(parsed);
  } catch {
    return [];
  }
}

export function writeChatHistory(storage, key, messages) {
  if (!storage || !key) return [];
  const sanitized = sanitizeChatHistory(messages);
  try {
    storage.setItem(key, JSON.stringify({ version: CHAT_HISTORY_VERSION, messages: sanitized }));
  } catch {
    return sanitized;
  }
  return sanitized;
}

export function clearChatHistory(storage, key) {
  if (!storage || !key) return;
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy modes; clearing the in-memory UI is still enough.
  }
}
