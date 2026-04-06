import {FDO_SDK} from "./index";
import { PluginCapability } from "./types";

/**
 * Public plugin contract for FDO SDK plugins.
 *
 * `render()` and `renderOnLoad()` are synchronous and return strings.
 * The SDK serializes those strings for host transport separately.
 */
export interface FDOInterface {
    declareCapabilities?(): PluginCapability[];
    init(): void;
    render(): string;
    renderOnLoad?(): string;
}

export default FDOInterface;
