import {DOM} from "./DOM";

export class DOMButton extends DOM {
    /**
     * Renders the button with current state.
     */
    public createButton(label: string, onClick: Function, options?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        const { blueprintClasses, style, disableDefaultClass, id } = this.mergeOptions(options);

        const defaultBlueprintClass = disableDefaultClass ? "" : "bp5-button";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);

        return this.createElement("button", {id: elementID, className: className, onClick: onClick}, label);
    }
}

