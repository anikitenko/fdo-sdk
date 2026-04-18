import {FDO_SDK} from "./index";
import { PluginCapability, RenderOnLoadOutput } from "./types";

/**
 * Public plugin contract for FDO SDK plugins.
 *
 * `render()` is synchronous and returns a string.
 * `renderOnLoad()` is synchronous and may return:
 * - a string source
 * - a function (serialized via `Function#toString`)
 * - `defineRenderOnLoad(...)` module output
 * The SDK serializes normalized source strings for host transport.
 */
export interface FDOInterface {
    declareCapabilities?(): PluginCapability[];
    init(): void;
    render(): string;
    renderOnLoad?(): RenderOnLoadOutput;
}

export default FDOInterface;
