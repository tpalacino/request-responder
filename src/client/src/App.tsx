import { Body2, Button, createTableColumn, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, Input, Label, LargeTitle, Link, makeStyles, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, MessageBar, MessageBarBody, Switch, TableCellLayout, Title1, type OnOpenChangeData, type TableColumnDefinition } from "@fluentui/react-components";
import { AddRegular, CheckmarkCircleRegular, CircleOffRegular, CloudArrowDownRegular, CloudArrowUpRegular, DeleteRegular, EditRegular, MoreVerticalRegular } from "@fluentui/react-icons";
import { useEffect, useState } from 'react';
import './App.css';
import { loadRules, saveRules, type Rule } from './Configuration';

export default function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showNewRule, setShowNewRule] = useState<boolean>(false);
  const [editRule, setEditRule] = useState<Rule | undefined>(undefined);
  const [deleteRule, setDeleteRule] = useState<Rule | undefined>(undefined);

  useEffect(() => {
    async function init() {
      const loadedRules = await loadRules();
      setRules(loadedRules);
    }
    init();
  }, []);

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
          const importedRules: Rule[] = JSON.parse(text);
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
          setRules(newRules);
        } catch (error) {
          console.error("Failed to import rules:", error);
          alert("Failed to import rules. Please make sure the file is a valid JSON with the correct format.");
        }
      }
      document.body.removeChild(filePicker);
    });
  };

  const columns: TableColumnDefinition<Rule>[] = [
    createTableColumn<Rule>({
      columnId: "name",
      compare: (a, b) => {
        return a.name.localeCompare(b.name);
      },
      renderHeaderCell: () => {
        return "Name";
      },
      renderCell: (item) => {
        return (
          <div className="row grow">
            <TableCellLayout style={{ color: item.disabled ? "gray" : "inherit" }}>
              {item.name}{` (${item.disabled ? "Disabled" : "Enabled"})`}
            </TableCellLayout>
            <Menu positioning={{ autoSize: true }}>
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
                        setRules(newRules);
                      }
                    }}
                  >
                    {item.disabled ? "Enable" : "Disable"}
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        );
      },
    }),
    createTableColumn<Rule>({
      columnId: "request",
      compare: (a, b) => {
        return a.match.localeCompare(b.match);
      },
      renderHeaderCell: () => {
        return "Request";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout style={{ color: item.disabled ? "gray" : "inherit" }}>
            {item.match}
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<Rule>({
      columnId: "response",
      compare: (a, b) => {
        return a.replacement.localeCompare(b.replacement);
      },
      renderHeaderCell: () => {
        return "Response";
      },
      renderCell: (item) => {
        return (
          <TableCellLayout style={{ color: item.disabled ? "gray" : "inherit" }}>
            {item.replacement}
          </TableCellLayout>
        );
      },
    }),
  ];

  return <div className='column padded'>
    <LargeTitle>Request Responder</LargeTitle>
    <Title1>Instructions</Title1>
    <Body2>Define rules with a pattern that matches network requests and redirects the request to another server.</Body2>
    <Body2>We package a lightweight server to handle serving static files. <Link href="server.zip">server.zip</Link></Body2>
    <Title1>Rules</Title1>
    <div className='row'>
      <Button appearance='primary' onClick={() => setShowNewRule(true)} icon={<AddRegular />}>Add</Button>
      <Button appearance='secondary' onClick={onImport} icon={<CloudArrowUpRegular />}>Import</Button>
      <Button appearance='secondary' disabled={!rules.length} onClick={onExport} icon={<CloudArrowDownRegular />}>Export</Button>
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
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<Rule>>
            {({ item, rowId }) => (
              <DataGridRow<Rule> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
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
      rule={editRule || (showNewRule ? { id: "", name: "", disabled: false, match: "", replacement: "" } : undefined)}
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
          setRules(newRules);
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
          setRules(newRules);
        }
        setDeleteRule(undefined);
      }}
    />
  </div>
}

interface RuleFormProps {
  rule: Rule | undefined;
  onClose: (rule?: Rule) => void;
}

function RuleForm(props: RuleFormProps) {
  const { rule, onClose } = props;

  const [name, setName] = useState<string>("");
  const [match, setMatch] = useState<string>("");
  const [replacement, setReplacement] = useState<string>("");
  const [testUrl, setTestUrl] = useState<string>("");
  const [disabled, setDisabled] = useState<boolean | null>(null);

  if (!rule) return null;

  const editMode = Boolean(rule.id);
  const canTest = (match || rule?.match)?.trim() !== "" && (replacement || rule?.replacement)?.trim() !== "" && testUrl.trim() !== "";
  const canSave = (
    (name.trim() !== "" && name !== rule?.name)
    ||
    (match.trim() !== "" && match !== rule?.match)
    ||
    (replacement.trim() !== "" && replacement !== rule?.replacement)
    ||
    (disabled !== null && disabled !== rule?.disabled)
  );

  const onSave = () => {
    onClose({
      id: editMode ? rule!.id : crypto.randomUUID(),
      name: name || rule?.name,
      disabled: typeof disabled === "boolean" ? disabled : rule?.disabled,
      match: match || rule?.match,
      replacement: replacement || rule?.replacement,
    });
  };

  const onTest = () => {
    const m = match || rule?.match;
    const r = replacement || rule?.replacement;
    const t = testUrl;
    if (m && r && t) {
      const params = new URLSearchParams();
      params.set("engine", "pcre");
      params.set("expression", m);
      params.set("text", t);
      params.set("tool", "replace");
      params.set("input", r);
      window.open(`https://regexr.com/?${params.toString()}`, "_blank");
    }
  };

  const onDismiss = (_: unknown, data: OnOpenChangeData) => {
    if (!data.open) {
      setName("");
      setMatch("");
      setReplacement("");
      setDisabled(null);
      setTestUrl("");
    }
  };

  return <Dialog open={true} onOpenChange={onDismiss}>
    <DialogSurface>
      <DialogBody>
        <DialogTitle>{editMode ? "Edit Rule" : "Add Rule"}</DialogTitle>
        <DialogContent>
          <div className='column padded'>
            <Label>
              <div className="column">
                <span>Name</span>
                <Input name='Name' placeholder='Name' value={name || rule?.name} onChange={(_, d) => setName(d.value)} />
              </div>
            </Label>
            <Label>
              <div className="column">
                <span>Match Pattern</span>
                <Input name='Match' placeholder='Match Pattern' value={match || rule?.match} onChange={(_, d) => setMatch(d.value)} />
              </div>
            </Label>
            <Label>
              <div className="column">
                <span>Replacement</span>
                <Input name='Replacement' placeholder='Replacement' value={replacement || rule?.replacement} onChange={(_, d) => setReplacement(d.value)} />
              </div>
            </Label>
            <Label>
              <div className="column">
                <span>Disabled</span>
                <Switch
                  name='Disabled'
                  placeholder='Disabled'
                  checked={typeof disabled === "boolean" ? disabled : rule?.disabled}
                  onChange={(_, d) => {
                    setDisabled(d.checked !== rule?.disabled ? d.checked : null);
                  }}
                />
              </div>
            </Label>
            <Label>
              <div className="column">
                <span>Test URL</span>
                <TestUrlField value={testUrl} canTest={canTest} onChange={setTestUrl} onTest={onTest} />
              </div>
            </Label>
          </div>
        </DialogContent>
        <DialogActions>
          <Button appearance="primary" onClick={() => onSave()} disabled={!canSave}>Save</Button>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary" onClick={() => onClose(undefined)}>Cancel</Button>
          </DialogTrigger>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
}

interface DeletePromptProps {
  rule: Rule | undefined;
  onClose: (confirmed: boolean) => void;
}

function DeletePrompt(props: DeletePromptProps) {
  const { rule, onClose } = props;

  if (!rule) return null;

  return <Dialog open={true}>
    <DialogSurface>
      <DialogBody>
        <DialogTitle>Delete Rule</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the rule "{rule.name}"?
        </DialogContent>
        <DialogActions>
          <Button appearance="primary" onClick={() => onClose(true)}>Delete</Button>
          <Button appearance="secondary" onClick={() => onClose(false)}>Cancel</Button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
}

const useTextUrlFieldStyles = makeStyles({
  root: {
    display: "flex",
    width: "100%",
  },
  input: {
    flexGrow: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  button: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
});

interface TestUrlFieldProps {
  value: string;
  canTest: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
}

function TestUrlField(props: TestUrlFieldProps) {
  const { value, canTest, onChange, onTest } = props;
  const styles = useTextUrlFieldStyles();

  return (
    <div className={styles.root}>
      <Input className={styles.input} name='TestURL' placeholder='Test URL' value={value} onChange={(_, d) => onChange(d.value)} />
      <Button className={styles.button} appearance="outline" onClick={onTest} disabled={!canTest}>Test</Button>
    </div>
  );
}