import "chrome-types/index.d.ts";
import { RE2JS } from "re2js";

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
        throw error;
    }
    return rules;
}

export async function saveRules(rules: Rule[]): Promise<boolean> {
    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRules.map(rule => rule.id),
            addRules: rules.filter(rule => !rule.disabled).map((rule, index) => ({
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
        try {
            await chrome.storage.sync.set({ rules });
        } catch (error) {
            try {
                const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: currentRules.map(rule => rule.id),
                    addRules: existingRules,
                });
            } catch (rollbackError) {
                console.error("Failed to restore dynamic rules after a storage error:", rollbackError);
            }
            throw error;
        }
        return true;
    } catch (error) {
        console.error("Failed to save rules:", error);
        return false;
    }
}

export async function testMatch(testUrl: string): Promise<number[]> {
    try {
        const rules = await loadRules();
        const matches: number[] = [];
        let enabledRuleId = 1;

        for (const rule of rules) {
            if (rule.disabled) {
                continue;
            }

            try {
                const re2 = RE2JS.compile(rule.match);
                if (re2.test(testUrl)) {
                    matches.push(enabledRuleId);
                }
            } catch (error) {
                console.warn(`Skipping invalid RE2 pattern for rule '${rule.name}' (${rule.id}):`, error);
            }

            enabledRuleId++;
        }

        return matches;
    } catch (error) {
        console.error("Failed to test rule:", error);
    }
    return [];
}