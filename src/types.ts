export type SidePanelConfig = {
    icon: string;
    label: string;
    submenu_list: {
        id: string;
        name: string;
        message_type: string
    }[];
};

export type QuickAction = {
    name: string;
    message_type: string;
    subtitle?: string;
    icon?: string;
};

export type AddQuickAction = {

}

export interface StoreType {
    get<T = any>(key: string): T | undefined
    set<T = any>(key: string, value: T): void
    remove?(key: string): void
    clear?(): void
    has?(key: string): boolean
    keys?(): string[]
}
