import {FDO_SDK} from "./index";

export interface FDOInterface {
    init(sdk: FDO_SDK): void;
    render(): string;
}

export default FDOInterface;
