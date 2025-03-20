import {Logger} from "./Logger";
import "electron";
import {Communicator} from "./Communicator";
import {PluginRegistry} from "./PluginRegistry";

export * from "./FDOInterface";
export * from "./PluginMetadata";
export * from "./QuickActionMixin";
export * from "./SidePanelMixin";
export * from "./PluginRegistry"
export * from "./types";
export * from "./DOM";
export * from "./DOMButton";
export * from "./DOMInput";
export * from "./DOMLink";
export * from "./DOMNested";
export * from "./DOMText";

declare global {
    interface Window {
        /**
         * Creates a request to plugin's backend.
         * @param type - The function name to call on the backend
         * @param data - The data to send to the backend
         * @returns {Promise<any>} - The response from the backend
         */
        createBackendReq: (type: string, data?: any) => Promise<any>;
        /**
         * Adds a global event listener.
         * @param eventType
         * @param callback
         */
        addGlobalEventListener: (eventType: keyof WindowEventMap, callback: (event: Event) => void) => void
        /**
         * Removes a global event listener.
         * @param eventType
         * @param callback
         */
        removeGlobalEventListener: (eventType: keyof WindowEventMap, callback: (event: Event) => void) => void
        /**
         * Waits for an element to be available in the DOM.
         * @param selector
         * @param callback
         * @param timeout
         */
        waitForElement: (selector: string, callback: (element: Element) => void, timeout?: number) => void
        /**
         * Injects a script into the page.
         * @param scriptContent
         */
        executeInjectedScript: (scriptContent: string) => void
    }

    type Gutter = {
        element: HTMLElement;
        track: number;
    };
    type MinSizes = { [track: number]: number };
    type Direction = 'row' | 'column';
    type GridTemplateProperty = 'grid-template-column' | 'grid-template-row';
    interface SplitOptions {
        // An array of objects, with `element` and `track` keys. `element` is the element in the grid to enable as a draggable gutter. `track` is the grid track the gutter element is positioned on. These must match.
        columnGutters?: Gutter[];
        // An array of objects, with `element` and `track` keys. `element` is the element in the grid to enable as a draggable gutter. `track` is the grid track the gutter element is positioned on. These must match.
        rowGutters?: Gutter[];
        // The minimum size in pixels for all tracks. Default: `0`
        minSize?: number;
        // The minimum size in pixels for all tracks. Default: `options.minSize`
        columnMinSize?: number;
        // The minimum size in pixels for all tracks. Default: `options.minSize`
        rowMinSize?: number;
        // An object keyed by `track` index, with values set to the minimum size in pixels for the track at that index. Allows individual minSizes to be specified by track. Note this option is plural with an `s`, while the two fallback options are singular. Default: `options.columnMinSize`
        columnMinSizes?: MinSizes;
        // An object keyed by `track` index, with values set to the minimum size in pixels for the track at that index. Allows individual minSizes to be specified by track. Note this option is plural with an `s`, while the two fallback options are singular. Default: `options.rowMinSize`
        rowMinSizes?: MinSizes;
        // Snap to minimum size at this offset in pixels. Set to `0` to disable snap. Default: `30`
        snapOffset?: number;
        // Snap to minimum size at this offset in pixels. Set to `0` to disable snap. Default: `options.snapOffset`
        columnSnapOffset?: number;
        // Snap to minimum size at this offset in pixels. Set to `0` to disable snap. Default: `options.snapOffset`
        rowSnapOffset?: number;
        // Drag this number of pixels at a time. Defaults to `1` for smooth dragging, but can be set to a pixel value to give more control over the resulting sizes. Default: `1`
        dragInterval?: number;
        // Drag this number of pixels at a time. Defaults to `1` for smooth dragging, but can be set to a pixel value to give more control over the resulting sizes. Default: `options.dragInterval`
        columnDragInterval?: number;
        // Drag this number of pixels at a time. Defaults to `1` for smooth dragging, but can be set to a pixel value to give more control over the resulting sizes. Default: `options.dragInterval`
        rowDragInterval?: number;
        // Cursor to show while dragging. Defaults to `'col-resize'` for column gutters and `'row-resize'` for row gutters.
        cursor?: string;
        // Cursor to show while dragging. Default: `'col-resize'`
        columnCursor?: string;
        // Cursor to show while dragging. Default: `'row-resize'`
        rowCursor?: string;
        // Called continuously on drag. For process intensive code, add a debounce function to rate limit this callback. `gridTemplateStyle` is the computed CSS value for `grid-template-column` or `grid-template-row`, depending on `direction`.
        onDrag?: (direction: Direction, track: number, gridTemplateStyle: string) => void;
        // Called on drag start.
        onDragStart?: (direction: Direction, track: number) => void;
        // Called on drag end.
        onDragEnd?: (direction: Direction, track: number) => void;
        // Called to update the CSS properties of the grid element. Must eventually apply the CSS value to the CSS prop, or the grid will not change. `gridTemplateStyle` is the computed CSS value of CSS rule `gridTemplateProp`.
        writeStyle?: (grid: HTMLElement, gridTemplateProp: GridTemplateProperty, gridTemplateStyle: string) => void;
        gridTemplateColumns?: string;
        gridTemplateRows?: string;
    }
    interface SplitInstance {
        // Adds a draggable row gutter. The element must be a direct descendant of the element with grid layout, and positioned in the specified track.
        addColumnGutter: (element: HTMLElement, track: number) => void;
        // Adds a draggable row gutter. The element must be a direct descendant of the element with grid layout, and positioned in the specified track.
        addRowGutter: (element: HTMLElement, track: number) => void;
        // Removes event listeners from a column gutter by track number. If `immediate = false` is passed, event handlers are removed after dragging ends. If a gutter isn't currently being dragged, it's event handlers are removed immediately.
        removeColumnGutter: (track: number, immediate?: boolean) => void;
        // Removes event listeners from a row gutter by track number. If `immediate = false` is passed, event handlers are removed after dragging ends. If a gutter isn't currently being dragged, it's event handlers are removed immediately.
        removeRowGutter: (track: number, immediate?: boolean) => void;
        // Destroy the instance by removing the attached event listeners. If `immediate = false` is passed, the instance is destroyed after dragging ends. If a gutter isn't currently being dragged, it's destroyed immediately.
        destroy: (immediate?: boolean) => void;
    }
    function Split(options: SplitOptions): SplitInstance;
}

export class FDO_SDK {
    public static readonly API_VERSION: string = "1.0.0"
    static readonly TYPE_TAG = Symbol("FDO_SDK")
    private readonly _logger: Logger = new Logger()
    private readonly communicator: Communicator = new Communicator()

    constructor() {
        PluginRegistry.registerPlugin(this)
        this.communicator.emit("init", {})
        if (this.render) {
            const originalRender = this.render.bind(this);
            const originalRenderOnLoad = this.renderOnLoad.bind(this);
            this.render = () => {
                const result = originalRender();
                return JSON.stringify(result);
            };
            this.renderOnLoad = () => {
                const result = originalRenderOnLoad();
                return JSON.stringify(result);
            };
        }
        this._logger.log("FDO_SDK initialized!")
    }

    public init(): void {
        const error = new Error("Method 'init' must be implemented by plugin.")
        this._logger.error(error)
        throw error
    }

    public render(): string {
        const error = new Error("Method 'render' must be implemented by plugin.")
        this._logger.error(error)
        throw error
    }

    public renderOnLoad(): string {
        const load = () => {}
        return load.toString()
    }

    public log(message: string): void {
        this._logger.log(message)
    }

    public error(error: Error): void {
        this._logger.error(error)
    }
}
