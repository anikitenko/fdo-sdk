import FDO_SDK from "./index";
import { IconNames } from "@blueprintjs/icons";

export type AllowedIcons = keyof typeof IconNames

export interface FDOInterface {
    init(sdk: FDO_SDK): void;
    render(): string;
    metadata: PluginMetadata;
}

export interface PluginMetadata {
    name: string;
    version: string;
    author: string;
    description: string;
    icon: AllowedIcons;
}
