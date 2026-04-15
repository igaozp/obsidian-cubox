import { App, Modal, Setting, Notice } from 'obsidian';
import { CuboxTag } from '../cuboxApi';

export const ALL_ITEMS = 'all_items';
export const NO_TAGS_ID = '';

export class TagSelectModal extends Modal {
    private selectedTags: Set<string> = new Set();
    private onConfirm: (selectedTags: string[]) => void;
    private tags: CuboxTag[] = [];
    private listEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(
        app: App, 
        tags: CuboxTag[], 
        initialSelectedTags: string[],
        onConfirm: (selectedTags: string[]) => void
    ) {
        super(app);
        this.tags = tags;
        
        // 初始化已选择的标签
        if (initialSelectedTags && initialSelectedTags.length > 0) {
            initialSelectedTags.forEach(id => {
                this.selectedTags.add(id);
            });
        }
        
        this.onConfirm = onConfirm;
    }

    async onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Manage Cubox tags to be synced' });
        contentEl.addClass('cubox-modal');
        
        this.listEl = contentEl.createDiv({ cls: 'tag-list-container cubox-list-container' });
        this.footerEl = contentEl.createDiv({ cls: 'modal-footer' });
        
        // 创建标签列表
        this.createTagList();
        
        // 添加确认和取消按钮
        const cancelButton = this.footerEl.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        const confirmButton = this.footerEl.createEl('button', { text: 'Done', cls: 'mod-cta' });
        confirmButton.addEventListener('click', () => {
            // 检查是否至少选择了一个选项
            if (this.selectedTags.size === 0) {
                new Notice('Please select at least one option.');
                return;
            }
            
            const resultTags = this.selectedTags.has(ALL_ITEMS) ? [ALL_ITEMS] : Array.from(this.selectedTags);

            this.onConfirm(resultTags);
            this.close();
        });
    }

    private createTagList() {
        this.listEl.empty();
        
        new Setting(this.listEl)
            .setName('All items')
            .addToggle(toggle => {
                toggle.setValue(this.selectedTags.has(ALL_ITEMS));
                toggle.onChange(value => {
                    this.handleTagToggle(ALL_ITEMS, value);
                    this.redraw();
                });
            });

        const allOn = this.selectedTags.has(ALL_ITEMS);
        const noTagsSetting = new Setting(this.listEl)
            .setName('No tags')
            .addToggle(toggle => {
                toggle.setDisabled(allOn);
                toggle.setValue(!allOn && this.selectedTags.has(NO_TAGS_ID));
                if (!allOn) {
                    toggle.onChange(value => {
                        this.handleTagToggle(NO_TAGS_ID, value);
                        this.redraw();
                    });
                }
            });
        if (allOn) {
            noTagsSetting.settingEl.addClass('is-disabled');
        }

        this.tags.forEach(tag => {
            const tagSetting = new Setting(this.listEl)
                .setName(tag.nested_name)
                .addToggle(toggle => {
                    toggle.setDisabled(allOn);
                    toggle.setValue(!allOn && this.selectedTags.has(tag.id));
                    if (!allOn) {
                        toggle.onChange(value => {
                            this.handleTagToggle(tag.id, value);
                            this.redraw();
                        });
                    }
                });
            if (allOn) {
                tagSetting.settingEl.addClass('is-disabled');
            }
        });
    }
    
    private handleTagToggle(tagId: string, isSelected: boolean) {
        if (tagId === ALL_ITEMS) {
            if (isSelected) {
                // 如果选择了"All Items"，清除其他所有选择，只保留ALL_TAGS_ID
                this.selectedTags.clear();
                this.selectedTags.add(ALL_ITEMS);
            } else {
                this.selectedTags.delete(ALL_ITEMS);
            }
        } else {
            if (isSelected) {
                this.selectedTags.delete(ALL_ITEMS);
                this.selectedTags.add(tagId);
            } else {
                this.selectedTags.delete(tagId);
            }
        }
    }
    
    private redraw() {
        this.createTagList();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 