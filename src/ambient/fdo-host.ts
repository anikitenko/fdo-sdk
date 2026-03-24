declare global {
    interface Window {
        createBackendReq: (type: string, data?: any) => Promise<any>;
        addGlobalEventListener: (eventType: keyof WindowEventMap, callback: (event: Event) => void) => void
        removeGlobalEventListener: (eventType: keyof WindowEventMap, callback: (event: Event) => void) => void
        waitForElement: (selector: string, callback: (element: Element) => void, timeout?: number) => void
        executeInjectedScript: (scriptContent: string) => void
        applyClassToSelector: (className: string, selector: string) => void
    }

    type Gutter = {
        element: HTMLElement;
        track: number;
    };
    type MinSizes = { [track: number]: number };
    type Direction = 'row' | 'column';
    type GridTemplateProperty = 'grid-template-column' | 'grid-template-row';

    interface SplitOptions {
        columnGutters?: Gutter[];
        rowGutters?: Gutter[];
        minSize?: number;
        columnMinSize?: number;
        rowMinSize?: number;
        columnMinSizes?: MinSizes;
        rowMinSizes?: MinSizes;
        snapOffset?: number;
        columnSnapOffset?: number;
        rowSnapOffset?: number;
        dragInterval?: number;
        columnDragInterval?: number;
        rowDragInterval?: number;
        cursor?: string;
        columnCursor?: string;
        rowCursor?: string;
        onDrag?: (direction: Direction, track: number, gridTemplateStyle: string) => void;
        onDragStart?: (direction: Direction, track: number) => void;
        onDragEnd?: (direction: Direction, track: number) => void;
        writeStyle?: (grid: HTMLElement, gridTemplateProp: GridTemplateProperty, gridTemplateStyle: string) => void;
        gridTemplateColumns?: string;
        gridTemplateRows?: string;
    }

    interface SplitInstance {
        addColumnGutter: (element: HTMLElement, track: number) => void;
        addRowGutter: (element: HTMLElement, track: number) => void;
        removeColumnGutter: (track: number, immediate?: boolean) => void;
        removeRowGutter: (track: number, immediate?: boolean) => void;
        destroy: (immediate?: boolean) => void;
    }

    function Split(options: SplitOptions): SplitInstance;

    interface NotyfNotification {
        triggerDismiss: () => void;
    }

    interface NotyfPosition {
        x: 'left' | 'center' | 'right';
        y: 'top' | 'center' | 'bottom';
    }

    interface NotyfOptions {
        duration?: number;
        ripple?: boolean;
        position?: NotyfPosition;
        dismissible?: boolean;
    }

    interface NotyfNotificationOptions extends NotyfOptions {
        type?: string;
        message?: string;
        icon?: string | boolean;
        background?: string;
        className?: string;
    }

    interface Notyf {
        success(message: string | NotyfNotificationOptions): NotyfNotification;
        error(message: string | NotyfNotificationOptions): NotyfNotification;
        open(options: NotyfNotificationOptions): NotyfNotification;
        dismissAll(): void;
    }

    interface NotyfConstructor {
        new(options?: NotyfOptions): Notyf;
    }

    interface HighlightResult {
        value: string;
        language?: string;
        relevance: number;
        illegal: boolean;
        errorRaised?: Error;
        second_best?: Omit<HighlightResult, 'second_best'>;
    }

    interface HighlightJS {
        highlight(code: string, options: { language: string; ignoreIllegals?: boolean }): HighlightResult;
        highlightAuto(code: string, languageSubset?: string[]): HighlightResult;
        highlightElement(element: HTMLElement): void;
        highlightAll(): void;
        registerLanguage(languageName: string, languageDefinition: any): void;
        getLanguage(languageName: string): any;
        listLanguages(): string[];
    }

    namespace AceAjax {
        interface Editor {
            setValue(value: string, cursorPos?: number): string;
            getValue(): string;
            setTheme(theme: string): void;
            setShowPrintMargin(show: boolean): void;
            setOption(name: string, value: any): void;
            setOptions(options: Partial<EditorOptions>): void;
            getSession(): EditSession;
            resize(force?: boolean): void;
            destroy(): void;
            on(event: string, callback: Function): void;
            off(event: string, callback: Function): void;
        }

        interface EditSession {
            setMode(mode: string): void;
            setValue(text: string): void;
            getValue(): string;
            setUseWrapMode(useWrapMode: boolean): void;
            setTabSize(tabSize: number): void;
            setUseSoftTabs(useSoftTabs: boolean): void;
        }

        interface EditorOptions {
            selectionStyle?: string;
            highlightActiveLine?: boolean;
            highlightSelectedWord?: boolean;
            readOnly?: boolean;
            cursorStyle?: string;
            mergeUndoDeltas?: boolean | string;
            behavioursEnabled?: boolean;
            wrapBehavioursEnabled?: boolean;
            autoScrollEditorIntoView?: boolean;
            copyWithEmptySelection?: boolean;
            useSoftTabs?: boolean;
            navigateWithinSoftTabs?: boolean;
            enableMultiselect?: boolean;
        }

        interface Ace {
            edit(el: string | HTMLElement, options?: Partial<EditorOptions>): Editor;
            createEditSession(text: string, mode: string): EditSession;
        }
    }

    interface Window {
        Notyf: NotyfConstructor;
        hljs: HighlightJS;
        ace: AceAjax.Ace;
    }
}

export {};
