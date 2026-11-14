import { loadRules, saveRules } from "./Configuration";

let pending = Promise.resolve();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "toggleRule" || typeof message.id !== "string" || typeof message.enabled !== "boolean") {
    return false;
  }

  pending = pending.then(async () => {
    try {
      const rules = await loadRules();
      if (!rules.some(rule => rule.id === message.id)) {
        sendResponse({ error: "This rule no longer exists." });
        return;
      }
      const updatedRules = rules.map(rule =>
        rule.id === message.id ? { ...rule, disabled: !message.enabled } : rule
      );
      sendResponse(await saveRules(updatedRules) ? {} : { error: "Could not update the rule. Please try again." });
    } catch (error) {
      console.error("Failed to update rule:", error);
      sendResponse({ error: "Could not update the rule. Please try again." });
    }
  });
  return true;
});
