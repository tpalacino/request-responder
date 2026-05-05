import { Body2, Button, createTableColumn, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, Input, LargeTitle, Link, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, MessageBar, MessageBarBody, TableCellActions, TableCellLayout, Title1, type TableColumnDefinition, type TableColumnId } from "@fluentui/react-components";
import { AddRegular, CheckmarkCircleRegular, CircleOffRegular, CloudArrowDownRegular, CloudArrowUpRegular, DeleteRegular, EditRegular, MoreVerticalRegular } from "@fluentui/react-icons";
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { loadRules, saveRules, testMatch, type Rule } from './Configuration';
import { DeletePrompt } from "./components/DeletePrompt";
import { RuleForm } from "./components/RuleForm";

type AppRule = Rule & {
  isMatch?: boolean;
}

export default function App() {
  const [rules, setRules] = useState<AppRule[]>([]);
  const [showNewRule, setShowNewRule] = useState<boolean>(false);
  const [editRule, setEditRule] = useState<AppRule | undefined>(undefined);
  const [deleteRule, setDeleteRule] = useState<AppRule | undefined>(undefined);
  const [testUrl, setTestUrl] = useState<string>("");

  const testMatchId = useRef<number>(NaN);

  const testRules = useCallback(async (newRules: AppRule[], newTestUrl: string, delay: number = 450) => {
    if (!isNaN(testMatchId.current)) {
      window.clearTimeout(testMatchId.current);
    }
    if (delay > 0) {
      testMatchId.current = window.setTimeout(() => testRules(newRules, newTestUrl, 0), delay);
      return;
    }
    if (!newTestUrl) {
      setRules(newRules.map(rule => ({ ...rule, isMatch: false })));
      return;
    }
    try {
      const matchingRuleIds = await testMatch(newTestUrl);
      let enabledIndex = 1;

      setRules(newRules.map(rule => {
        if (rule.disabled) {
          return { ...rule, isMatch: false };
        }

        const isMatch = matchingRuleIds.includes(enabledIndex);
        enabledIndex++;

        return { ...rule, isMatch };
      }));
    } catch (error) {
      console.error("Failed to test URL:", error);
    } finally {
      testMatchId.current = NaN;
    }
  }, []);

  const handleRulesChanged = useCallback((newRules: AppRule[]) => {
    setRules(newRules);
    testRules(newRules, testUrl);
  }, [testRules, testUrl]);

  useEffect(() => {
    async function init() {
      const loadedRules = await loadRules();
      handleRulesChanged(loadedRules);
    }
    init();
  }, [handleRulesChanged]);

  const onExport = () => {
    const dataStr = JSON.stringify(rules, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none !important";
    a.href = url;
    a.download = `request-responder-rules-${new Date().toISOString().replace(/[:.]/g, "")}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const onImport = async () => {
    const filePicker = document.createElement("input");
    filePicker.style.display = "none !important";
    filePicker.type = "file";
    document.body.appendChild(filePicker);
    filePicker.click();
    filePicker.addEventListener("change", async () => {
      const file = filePicker.files?.[0];
      if (file) {
        try {
          const newRules = rules.slice();
          const text = await file.text();
          const importedRules: AppRule[] = JSON.parse(text);
          for (const rule of importedRules) {
            if (typeof rule.name === "string" && typeof rule.match === "string" && typeof rule.replacement === "string" && typeof rule.disabled === "boolean") {
              if (typeof rule.id !== "string" || !rule.id) {
                rule.id = crypto.randomUUID();
              }
              if (newRules.some(r => r.id === rule.id)) {
                continue;
              }
              newRules.push({
                id: rule.id,
                name: rule.name,
                match: rule.match,
                replacement: rule.replacement,
                disabled: Boolean(rule.disabled),
              });
            }
          }
          await saveRules(newRules);
          handleRulesChanged(newRules);
        } catch (error) {
          console.error("Failed to import rules:", error);
          alert("Failed to import rules. Please make sure the file is a valid JSON with the correct format.");
        }
      }
      document.body.removeChild(filePicker);
    });
  };

  const onTest = async (newTestUrl: string) => {
    setTestUrl(newTestUrl);
    if (URL.canParse(newTestUrl)) {
      testRules(rules, newTestUrl);
    }
  }

  const onClear = async () => {
    setTestUrl("");
    testRules(rules, "", 0);
  }

  const columns: TableColumnDefinition<AppRule>[] = [
    createTableColumn<AppRule>({
      columnId: "name",
      compare: (a, b) => {
        return a.name.localeCompare(b.name);
      },
      renderHeaderCell: () => {
        return "Name";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout truncate style={{ color: item.disabled ? "gray" : "inherit" }}>
            {item.name}{` (${item.disabled ? "Disabled" : "Enabled"})`}
            <TableCellActions>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button icon={<MoreVerticalRegular />} />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem icon={<EditRegular />} onClick={() => setEditRule(item)}>Edit</MenuItem>
                    <MenuItem icon={<DeleteRegular />} onClick={() => setDeleteRule(item)}>Delete</MenuItem>
                    <MenuItem
                      icon={item.disabled ? <CheckmarkCircleRegular /> : <CircleOffRegular />}
                      onClick={async () => {
                        const newRules = rules.slice();
                        const targetRule = newRules.find(r => r.id === item.id);
                        if (targetRule) {
                          targetRule.disabled = !item.disabled;
                          await saveRules(newRules);
                          handleRulesChanged(newRules);
                        }
                      }}
                    >
                      {item.disabled ? "Enable" : "Disable"}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </TableCellActions>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<AppRule>({
      columnId: "match",
      compare: (a, b) => {
        return a.match.localeCompare(b.match);
      },
      renderHeaderCell: () => {
        return "Match Pattern";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout truncate style={{ color: item.disabled ? "gray" : "inherit" }}>
            {item.match}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<AppRule>({
      columnId: "replacement",
      compare: (a, b) => {
        return a.replacement.localeCompare(b.replacement);
      },
      renderHeaderCell: () => {
        return "Replacement";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout truncate style={{ color: item.disabled ? "gray" : "inherit" }}>
            {item.replacement}
          </TableCellLayout>
        );
      },
    }),
  ];

  const isTesting = testUrl.trim() !== "" && isNaN(testMatchId.current);
  if (isTesting) {
    columns.unshift(createTableColumn<AppRule>({
      columnId: "isMatch",
      renderHeaderCell: () => {
        return "Match";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout>
            {item.isMatch
              ? <CheckmarkCircleRegular style={{ color: "green" }} />
              : <CircleOffRegular style={{ color: "red" }} />}
          </TableCellLayout>
        );
      },
    }));
  }

  const ruleFormRule = editRule || (showNewRule ? { id: "", name: "", disabled: false, match: "", replacement: "" } : undefined);

  return <div className='column padded'>
    <LargeTitle>Request Responder</LargeTitle>
    <Title1>Instructions</Title1>
    <Body2>Define rules with a pattern that matches network requests and redirects the request to another server.</Body2>
    <Body2>We package a lightweight server to handle serving static files. <Link href="server.zip">server.zip</Link></Body2>
    <Title1>Rules</Title1>
    <div className='row'>
      <div className="row grow">
        <Button appearance='primary' onClick={() => setShowNewRule(true)} icon={<AddRegular />}>Add</Button>
        <Button appearance='secondary' onClick={onImport} icon={<CloudArrowUpRegular />}>Import</Button>
        <Button appearance='secondary' disabled={!rules.length} onClick={onExport} icon={<CloudArrowDownRegular />}>Export</Button>
      </div>
      <div className="row grow">
        <Input name='TestUrl' className="grow" placeholder='Test URL' value={testUrl} onChange={(_, d) => onTest(d.value)} />
        <Button appearance='secondary' disabled={!rules.length} onClick={onClear} icon={<DeleteRegular />}>Clear</Button>
      </div>
    </div>
    {rules.length > 0
      ? <div style={{ overflowX: "auto" }}>
        <DataGrid
          items={rules}
          columns={columns}
          sortable
          getRowId={rule => rule.id}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell, columnId }) => (
                <DataGridHeaderCell style={getStyle(columnId, columns.length)} >{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<AppRule>>
            {({ item, rowId }) => (
              <DataGridRow<AppRule> key={rowId} className={isTesting ? (item.isMatch ? "match" : "non-match") : undefined}>
                {({ renderCell, columnId }) => (
                  <DataGridCell style={getStyle(columnId, columns.length)} >{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </div>
      : <MessageBar intent="info">
        <MessageBarBody>
          No rules defined. Click the "Add Rule" button to create your first rule.
        </MessageBarBody>
      </MessageBar>}
    <RuleForm
      key={ruleFormRule?.id}
      rule={ruleFormRule}
      onClose={async (rule) => {
        if (rule) {
          const newRules = rules.slice();
          const index = newRules.findIndex(r => r.id === rule.id);
          if (index >= 0) {
            newRules[index] = rule;
          } else {
            newRules.push(rule);
          }
          await saveRules(newRules);
          handleRulesChanged(newRules);
        }
        setShowNewRule(false);
        setEditRule(undefined);
      }}
    />
    <DeletePrompt
      rule={deleteRule}
      onClose={async (confirmed: boolean) => {
        if (confirmed && deleteRule) {
          const newRules = rules.filter(r => r.id !== deleteRule.id);
          await saveRules(newRules);
          handleRulesChanged(newRules);
        }
        setDeleteRule(undefined);
      }}
    />
  </div>
}

const IS_MATCH_WIDTH = 42;

function getStyle(columnId: TableColumnId, columnCount: number): React.CSSProperties | undefined {
  if (columnId === "isMatch") {
    return { width: IS_MATCH_WIDTH, minWidth: IS_MATCH_WIDTH, maxWidth: IS_MATCH_WIDTH };
  } else {
    return {
      width: `calc(${100 / columnCount}% - ${IS_MATCH_WIDTH}px)`,
      minWidth: `calc(${100 / columnCount}% - ${IS_MATCH_WIDTH}px)`,
      maxWidth: `calc(${100 / columnCount}% - ${IS_MATCH_WIDTH}px)`,
    };
  }
  return undefined;
}