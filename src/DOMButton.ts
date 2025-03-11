import {DOM} from "./DOM";

export class DOMButton extends DOM {
    private readonly state = {
        loading: false,
        disabled: false,
    };

    private readonly buttonElement: HTMLElement | null = null;

    /**
     * Updates the button state and re-renders it.
     */
    public setState(newState: Partial<typeof this.state>) {
        Object.assign(this.state, newState);
        this.render();
    }

    /**
     * Renders the button with current state.
     */
    public createButton(label: string, onClick: Function, options?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        const { blueprintClasses, style, disableDefaultClass } = this.mergeOptions(options);

        const defaultBlueprintClass = disableDefaultClass ? "" : "bp5-button";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");

        // Button attributes
        const props: Record<string, any> = {
            class: className,
            onclick: this.state.loading ? undefined : onClick, // Disable click if loading
            disabled: this.state.disabled,
        };

        // Add loading indicator if needed
        const buttonContent = this.state.loading ? "Loading..." : label;

        return this.createElement("button", props, buttonContent);
    }

    /**
     * Updates the existing button instead of re-creating it.
     */
    private render() {
        if (!this.buttonElement) return; // If button is not created yet, do nothing
        const button = this.buttonElement as HTMLButtonElement;
        button.textContent = this.state.loading ? "Loading..." : this.buttonElement.textContent;
        button.classList.toggle("bp5-disabled", this.state.disabled);
        button.disabled = this.state.disabled;
    }

    /**
     * Public method to enable loading state.
     */
    public setLoading(loading: boolean) {
        this.setState({ loading });
    }

    /**
     * Public method to enable/disable the button.
     */
    public setDisabled(disabled: boolean) {
        this.setState({ disabled });
    }
}

