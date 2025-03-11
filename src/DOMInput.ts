import {DOM} from "./DOM";

export class DOMInput extends DOM {
    public createInput(type: string, options?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        const { blueprintClasses, style, disableDefaultClass } = this.mergeOptions(options);

        const defaultBlueprintClass = disableDefaultClass ? "" : "bp5-button";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");

        return this.createElement("input", { class: className, type: type });
    }
}