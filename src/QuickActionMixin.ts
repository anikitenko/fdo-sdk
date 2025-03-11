import {QuickAction} from "./types";

export function QuickActionMixin<T extends new (...args: any[]) => {}>(Base: T) {
    return class extends Base {
        defineQuickActions(): QuickAction[] {
            return []
        }
    };
}

export default QuickActionMixin
