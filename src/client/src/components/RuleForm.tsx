import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, InfoLabel, Input, Label, Link, Switch, type OnOpenChangeData } from "@fluentui/react-components";
import { useState } from 'react';
import { type Rule } from '../Configuration';

interface RuleFormProps {
    rule: Rule | undefined;
    onClose: (rule?: Rule) => void;
}

export function RuleForm(props: RuleFormProps) {
    const { rule, onClose } = props;

    const [name, setName] = useState<string | null>(null);
    const [match, setMatch] = useState<string | null>(null);
    const [replacement, setReplacement] = useState<string | null>(null);
    const [disabled, setDisabled] = useState<boolean | null>(null);

    if (!rule) return null;

    const editMode = Boolean(rule.id);
    const canSave = (
        (name !== null && name.trim() !== "" && name !== rule?.name)
        ||
        (match !== null && match.trim() !== "" && match !== rule?.match)
        ||
        (replacement !== null && replacement.trim() !== "" && replacement !== rule?.replacement)
        ||
        (disabled !== null && disabled !== rule?.disabled)
    );

    const onSave = () => {
        onClose({
            id: editMode ? rule!.id : crypto.randomUUID(),
            name: name !== null ? name : rule?.name,
            disabled: typeof disabled === "boolean" ? disabled : rule?.disabled,
            match: match !== null ? match : rule?.match,
            replacement: replacement !== null ? replacement : rule?.replacement,
        });
    };

    const onDismiss = (_: unknown, data: OnOpenChangeData) => {
        if (!data.open) {
            setName(null);
            setMatch(null);
            setReplacement(null);
            setDisabled(null);
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
                                <Input name='Name' placeholder='Name' value={name !== null ? name : rule?.name} onChange={(_, d) => setName(d.value)} />
                            </div>
                        </Label>
                        <Label>
                            <div className="column">
                                <InfoLabel
                                    info={(
                                        <div>
                                            <span>I recommend using RegExr to validate the pattern.</span>
                                            <br />
                                            <Link href="https://regexr.com/?engine=pcre&tool=replace">RegExr</Link>
                                        </div>
                                    )}
                                >
                                    <span>Match Pattern</span>
                                </InfoLabel>
                                <Input name='Match' placeholder='Match Pattern' value={match !== null ? match : rule?.match} onChange={(_, d) => setMatch(d.value)} />
                            </div>
                        </Label>
                        <Label>
                            <div className="column">
                                <span>Replacement</span>
                                <Input name='Replacement' placeholder='Replacement' value={replacement !== null ? replacement : rule?.replacement} onChange={(_, d) => setReplacement(d.value)} />
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