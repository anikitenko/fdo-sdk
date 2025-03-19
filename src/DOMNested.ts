import {DOM} from "./DOM";

export class DOMNested extends DOM {
    public createNestedBlockDiv(
        children: any[],
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style, id } = this.mergeOptions(options);

        const defaultBlueprintClass = "";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);
        return this.createElement("div", {id: elementID, className: className}, children);
    }

    public createNestedList(
        children: any[],
        unstyled?: boolean,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style, id } = this.mergeOptions(options);

        const defaultBlueprintClass = unstyled ? "bp5-list-unstyled" : "bp5-list";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);
        return this.createElement("ul", {id, elementID, className: className}, ...children);
    }
}