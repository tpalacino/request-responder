import "chrome-types/index.d.ts";

const RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
    "csp_report",
    "font",
    "image",
    "main_frame",
    "media",
    "object",
    "other",
    "ping",
    "script",
    "stylesheet",
    "sub_frame",
    "webbundle",
    "websocket",
    "webtransport",
    "xmlhttprequest",
];

export interface Rule {
    id: string;
    name: string;
    disabled: boolean;
    match: string;
    replacement: string;
}

export async function loadRules(): Promise<Rule[]> {
    const rules: Rule[] = [];
    try {
        const raw = await chrome.storage.sync.get("rules");
        if (raw.rules) {
            for (const rule of raw.rules) {
                rules.push(rule);
            }
        }
    } catch (error) {
        console.error("Failed to load rules:", error);
    }
    return rules;
}

async function clearDynamicRules(): Promise<void> {
    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingRules.map(rule => rule.id) });
    } catch (error) {
        console.error("Failed to clear existing dynamic rules:", error);
        throw new Error("Failed to clear existing dynamic rules: ", { cause: error });
    }
}

async function updatedDeynamicRules(rules: Rule[]): Promise<void> {
    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: rules.map((rule, index) => ({
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

export async function saveRules(rules: Rule[]): Promise<boolean> {
    try {
        await clearDynamicRules();
        if (Array.isArray(rules) && rules.length > 0) {
            await updatedDeynamicRules(rules.filter(rule => !rule.disabled));
        }
        await chrome.storage.sync.set({ rules });
        return true;
    } catch (error) {
        console.error("Failed to save rules:", error);
        return false;
    }
}

export async function testMatch(testUrl: string): Promise<number[]> {
    try {
        for (const resourceType of RESOURCE_TYPES) {
            const result = await chrome.declarativeNetRequest.testMatchOutcome({
                url: testUrl,
                type: resourceType,
                tabId: 0,
            });
            if (result && result.matchedRules && result.matchedRules.length > 0) {
                return result.matchedRules.map(rule => rule.ruleId);
            }
        }
    } catch (error) {
        console.error("Failed to test rule:", error);
    }
    return [];
}