import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from "@fluentui/react-components";
import { type Rule } from '../Configuration';

interface DeletePromptProps {
    rule: Rule | undefined;
    onClose: (confirmed: boolean) => void;
}

export function DeletePrompt(props: DeletePromptProps) {
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