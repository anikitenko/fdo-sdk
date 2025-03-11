import {DOM} from "./DOM";

export class DOMNested extends DOM {
    public createNestedBlockDiv(
        children: any[],
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style } = this.mergeOptions(options);

        const defaultBlueprintClass = "";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        return this.createElement("div", {class: className}, ...children);
    }

    public createNestedList(
        children: any[],
        unstyled?: boolean,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style } = this.mergeOptions(options);

        const defaultBlueprintClass = unstyled ? "bp5-list-unstyled" : "bp5-list";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        return this.createElement("ul", {class: className}, ...children);
    }
}