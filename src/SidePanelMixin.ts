import {SidePanelConfig} from "./types";

export function SidePanelMixin<T extends new (...args: any[]) => {}>(Base: T) {
    return class extends Base {
        defineSidePanel(): SidePanelConfig {
            return {icon: "", label: "", submenu_list: []}
        }
    };
}

export default SidePanelMixin
