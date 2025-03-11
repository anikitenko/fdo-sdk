import {FDO_SDK} from "./index";
import PluginMetadata from "./PluginMetadata";

export interface FDOInterface {
    init(sdk: FDO_SDK): void;
    render(): string;
    metadata: PluginMetadata;
}

export default FDOInterface;
