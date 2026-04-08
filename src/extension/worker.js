chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg.type === "request-responder-rules-changed" && Array.isArray(msg.add) && Array.isArray(msg.remove)) {
        reloadDynamicRules(msg.add, msg.remove)
            .then(() => sendResponse({ ok: true }))
            .catch(err => {
                console.error("Failed to reload dynamic rules:", err);
                sendResponse({ ok: false, error: err });
            });
    }
});

async function reloadDynamicRules(rulesToAdd, rulesToRemove) {
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rulesToRemove.map((_, i) => i + 1),
        addRules: rulesToAdd.map((rule, index) => ({
            id: index + 1,
            priority: 1,
            action: {
                type: "redirect",
                redirect: { regexSubstitution: rule.replacement }
            },
            condition: {
                regexFilter: rule.match,
                resourceTypes: ["csp_report", "font", "image", "main_frame", "media", "object", "other", "ping", "script", "stylesheet", "sub_frame", "webbundle", "websocket", "webtransport", "xmlhttprequest"]
            }
        }))
    });
}