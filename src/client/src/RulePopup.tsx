import { Button, MessageBar, MessageBarBody, Spinner, Switch, Text, Title3 } from "@fluentui/react-components";
import { SettingsRegular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { loadRules, type Rule } from "./Configuration";

export function Popup() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let changed = false;
    const onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "sync" && changes.rules) {
        changed = true;
        setRules(changes.rules.newValue ?? []);
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);
    loadRules().then(loaded => {
      if (active && !changed) setRules(loaded);
    }).catch(() => {
      if (active) setError("Could not load rules. Close and reopen the popup to retry.");
    });
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  const toggleRule = async (id: string, enabled: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result: { error?: string } = await chrome.runtime.sendMessage({ type: "toggleRule", id, enabled });
      if (result.error) setError(result.error);
    } catch (error) {
      console.error("Failed to update rule:", error);
      setError("Could not update the rule. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const openOptions = async () => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error("Failed to open options:", error);
      setError("Could not open the options page.");
    }
  };

  return (
    <main className="popup">
      <header className="popup-header">
        <Title3>Request Responder</Title3>
        <Button appearance="subtle" icon={<SettingsRegular />} aria-label="Open options" onClick={() => { void openOptions(); }}>
          Options
        </Button>
      </header>
      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {rules === null
        ? !error && <Spinner label="Loading rules..." />
        : rules.length === 0
          ? <Text>No rules yet. Open Options to add a rule.</Text>
          : <ul className="rules-list" aria-label="Rules">
            {rules.map(rule => (
              <li className="rule" key={rule.id}>
                <Text className="rule-name" title={rule.name}>{rule.name}</Text>
                <Switch
                  aria-label={rule.name}
                  checked={!rule.disabled}
                  disabled={saving}
                  onChange={(_, data) => { void toggleRule(rule.id, data.checked); }}
                />
              </li>
            ))}
          </ul>}
    </main>
  );
}
