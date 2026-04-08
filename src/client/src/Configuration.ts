import "chrome-types/index.d.ts";

export interface Rule {
    id: string;
    name: string;
    disabled: boolean;
    match: string;
    replacement: string;
}

const isExtension = typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";

async function loadRulesFromExtensionStorage(): Promise<Rule[]> {
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

function loadRulesFromBrowserStorage(): Rule[] {
    const rules: Rule[] = [];
    try {
        const raw = localStorage.getItem("rules");
        if (raw) {
            const parsed = JSON.parse(raw);
            for (const rule of parsed) {
                rules.push(rule);
            }
        }
    } catch (error) {
        console.error("Failed to load rules:", error);
    }
    return rules;
}

export async function loadRules(): Promise<Rule[]> {
    if (isExtension) {
        return await loadRulesFromExtensionStorage();
    }
    return loadRulesFromBrowserStorage();
}

async function saveRulesToExtensionStorage(rules: Rule[]): Promise<void> {
    try {
        const existingRules = await loadRulesFromExtensionStorage();
        await chrome.storage.sync.set({ rules });
        const result = await chrome.runtime.sendMessage({
            type: "request-responder-rules-changed",
            add: rules.filter(rule => !rule.disabled),
            remove: existingRules
        });
        if (!result.ok) {
            throw result.error;
        }
    } catch (error) {
        console.error("Failed to save rules:", error);
    }
}

function saveRulesToBrowserStorage(rules: Rule[]): void {
    try {
        localStorage.setItem("rules", JSON.stringify(rules));
    } catch (error) {
        console.error("Failed to save rules:", error);
    }
}

export async function saveRules(rules: Rule[]): Promise<void> {
    if (isExtension) {
        await saveRulesToExtensionStorage(rules);
    } else {
        saveRulesToBrowserStorage(rules);
    }
}