import {FDO_SDK} from "./index";

/**
 * Public plugin contract for FDO SDK plugins.
 *
 * `render()` and `renderOnLoad()` are synchronous and return strings.
 * The SDK serializes those strings for host transport separately.
 */
export interface FDOInterface {
    init(): void;
    render(): string;
    renderOnLoad?(): string;
}

export default FDOInterface;
