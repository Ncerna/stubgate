import { Icon } from '../../ui/icons';
import { useT } from '../../ui/i18n';
import type { ImportMode } from '../../core';

export type DialogState =
  | { kind: 'import'; fileName: string; count: number; mode: ImportMode }
  | { kind: 'importError' }
  | { kind: 'clear' }
  | { kind: 'delete'; scope: 'all' | 'disabled'; count: number };

interface Props {
  dialog: DialogState;
  onMode(m: ImportMode): void;
  onConfirm(): void;
  onCancel(): void;
}

export function Dialogs({ dialog, onMode, onConfirm, onCancel }: Props) {
  const t = useT();
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dlg" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
        {dialog.kind === 'import' && (
          <>
            <h3>{t.importTitle}</h3>
            <div className="file">
              <Icon name="file" />
              <div><b>{dialog.fileName}</b><span className="s2">{t.importCount(dialog.count)}</span></div>
            </div>
            <button className={`opt ${dialog.mode === 'add' ? 'sel' : ''}`} role="radio" aria-checked={dialog.mode === 'add'} onClick={() => onMode('add')}>
              <span className="radio" /><span><b>{t.importAdd}</b><span className="s2">{t.importAddDesc}</span></span>
            </button>
            <button className={`opt ${dialog.mode === 'replace' ? 'sel' : ''}`} role="radio" aria-checked={dialog.mode === 'replace'} onClick={() => onMode('replace')}>
              <span className="radio" /><span><b>{t.importReplace}</b><span className="s2">{t.importReplaceDesc}</span></span>
            </button>
            <div className="btns">
              <button className="btn" onClick={onCancel}>{t.cancel}</button>
              <button className="btn primary" autoFocus onClick={onConfirm}>{t.importBtn}</button>
            </div>
          </>
        )}
        {dialog.kind === 'importError' && (
          <>
            <h3>{t.importErrorTitle}</h3>
            <p>{t.importError}</p>
            <div className="btns"><button className="btn" autoFocus onClick={onCancel}>{t.close}</button></div>
          </>
        )}
        {dialog.kind === 'clear' && (
          <>
            <h3>{t.clearTitle}</h3>
            <p>{t.clearBody}</p>
            <div className="btns">
              <button className="btn" autoFocus onClick={onCancel}>{t.cancel}</button>
              <button className="btn danger" onClick={onConfirm}>{t.clearBtn}</button>
            </div>
          </>
        )}
        {dialog.kind === 'delete' && (
          <>
            <h3>{dialog.scope === 'all' ? t.confirmDeleteAllTitle : t.confirmDeleteDisabledTitle}</h3>
            <p>{dialog.scope === 'all' ? t.confirmDeleteAllBody(dialog.count) : t.confirmDeleteDisabledBody(dialog.count)}</p>
            <div className="btns">
              <button className="btn" autoFocus onClick={onCancel}>{t.cancel}</button>
              <button className="btn danger" onClick={onConfirm}>{t.del}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
