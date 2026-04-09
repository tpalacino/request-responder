chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg.type === "request-responder-rules-changed") {
        reloadDynamicRules(msg.add)
            .then(() => sendResponse({ ok: true }))
            .catch(err => {
                console.error("Failed to reload dynamic rules:", err);
                sendResponse({ ok: false, error: err });
            });
        return true;
    }
});

async function reloadDynamicRules(rulesToAdd) {
    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingRules.map(rule => rule.id) });
    } catch (error) {
        console.error("Failed to clear existing dynamic rules:", error);
        throw new Error("Failed to clear existing dynamic rules: ", { cause: error });
    }
    if (Array.isArray(rulesToAdd) && rulesToAdd.length > 0) {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
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
        } catch (error) {
            console.error("Failed to add new dynamic rules:", error);
            throw new Error("Failed to add new dynamic rules: ", { cause: error });
        }
    }
}