import { App, Modal, Setting, Notice, setIcon } from 'obsidian';

/** API 层使用的五个类型，在 UI 中合并为 Others */
export const OTHERS_MEMBER_TYPES = ['Memo', 'Image', 'Audio', 'Video', 'File'] as const;

const OTHERS_MEMBER_SET = new Set<string>(OTHERS_MEMBER_TYPES);

/** 配置中用于表示上述五类合并项的标识 */
export const OTHERS_TYPE_ID = 'Others';

export const ALL_CONTENT_TYPES = ['Article', 'Snippet', OTHERS_TYPE_ID];

/**
 * 读盘或读入的 typeFilter 规范化：将历史配置中的 Memo/Image/... 合并为 Others
 */
export function normalizeTypeFilterStorage(typeFilter: string[] | undefined): string[] {
    if (!typeFilter || typeFilter.length === 0) return [];
    const hasLegacyOthers = OTHERS_MEMBER_TYPES.some((t) => typeFilter.includes(t));
    const next = typeFilter.filter((t) => !OTHERS_MEMBER_SET.has(t));
    if (hasLegacyOthers && !next.includes(OTHERS_TYPE_ID)) {
        next.push(OTHERS_TYPE_ID);
    }
    return next;
}

/**
 * 任意历史成员被选中则视为 Others 选中，供类型选择弹窗初始状态使用
 */
export function storedTypesToModalSelection(stored: string[]): string[] {
    const result = new Set<string>();
    let othersSelected = false;
    for (const t of stored) {
        if (OTHERS_MEMBER_SET.has(t)) {
            othersSelected = true;
        } else if (t === OTHERS_TYPE_ID) {
            othersSelected = true;
        } else {
            result.add(t);
        }
    }
    if (othersSelected) {
        result.add(OTHERS_TYPE_ID);
    }
    return Array.from(result);
}

/** 发起 API 请求时把 Others 展开为五个具体 type_filters */
export function expandTypeFilterForApi(stored: string[]): string[] {
    const out: string[] = [];
    for (const t of stored) {
        if (t === OTHERS_TYPE_ID) {
            out.push(...OTHERS_MEMBER_TYPES);
        } else {
            out.push(t);
        }
    }
    return [...new Set(out)];
}

/** Article + Snippet + Others（或历史上五个子类全选）视为「全部类型」 */
export function isFullTypeSelection(stored: string[]): boolean {
    if (!stored || stored.length === 0) return false;
    const hasArticle = stored.includes('Article');
    const hasSnippet = stored.includes('Snippet');
    const hasOthers =
        stored.includes(OTHERS_TYPE_ID) ||
        OTHERS_MEMBER_TYPES.every((t) => stored.includes(t));
    return hasArticle && hasSnippet && hasOthers;
}

export class TypeSelectModal extends Modal {
    private onSave: (selectedTypes: string[]) => void;
    private selectedTypes: Set<string> = new Set();
    private listEl: HTMLElement;
    private footerEl: HTMLElement;
    private domain: string;

    constructor(
        app: App,
        initialSelected: string[] = [],
        onSave: (selectedTypes: string[]) => void,
        domain: string = ''
    ) {
        super(app);
        this.onSave = onSave;
        this.domain = domain;

        if (initialSelected && initialSelected.length > 0) {
            initialSelected.forEach((id) => {
                if (id) this.selectedTypes.add(id);
            });
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Manage Cubox content types to be synced' });
        contentEl.addClass('cubox-modal');

        this.listEl = contentEl.createDiv({ cls: 'type-list-container cubox-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });

        this.createTypeList();

        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const saveButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        saveButton.addEventListener('click', () => {
            if (this.selectedTypes.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }

            const selectedTypes = Array.from(this.selectedTypes);
            this.onSave(selectedTypes);
            this.close();
        });
    }

    private createTypeList() {
        this.listEl.empty();

        ALL_CONTENT_TYPES.forEach((typeId) => {
            const row = new Setting(this.listEl);
            if (typeId === OTHERS_TYPE_ID) {
                const nameFrag = document.createDocumentFragment();
                const label = document.createElement('span');
                label.textContent = OTHERS_TYPE_ID;
                nameFrag.appendChild(label);
                const infoEl = document.createElement('span');
                infoEl.className = 'cubox-others-info-icon';
                infoEl.setAttribute('aria-label', 'About Memo and file types');
                setIcon(infoEl, 'info');
                infoEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url =
                        this.domain === 'cubox.pro'
                            ? 'https://story.cubox.pro/memo-file-update'
                            : 'https://cubox.cc/blog/memo-file-update/';
                    window.open(url);
                });
                nameFrag.appendChild(infoEl);
                row.setName(nameFrag);
            } else {
                row.setName(typeId);
            }
            row.addToggle((toggle) => {
                toggle.setValue(this.selectedTypes.has(typeId));
                toggle.onChange((value) => {
                    this.handleTypeToggle(typeId, value);
                    this.redraw();
                });
            });
        });
    }

    private handleTypeToggle(typeId: string, isSelected: boolean) {
        if (isSelected) {
            this.selectedTypes.add(typeId);
        } else {
            this.selectedTypes.delete(typeId);
        }
    }

    private redraw() {
        this.createTypeList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
