/**
 * Example 5: Advanced DOM Generation
 * 
 * This example demonstrates how to create rich, styled UI components using the SDK's
 * DOM generation classes. It covers the various DOM helper classes (DOMText, DOMButton,
 * DOMInput, etc.) and shows how to build complex interfaces with custom styling using
 * CSS-in-JS via goober.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Use DOM helper classes for programmatic HTML generation
 * - Apply CSS-in-JS styling with goober integration
 * - Build complex nested UI structures
 * - Create forms with multiple input types
 * - Compose reusable UI components
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display a styled card layout with custom CSS
 * 2. Show a complex form with multiple input types
 * 3. Demonstrate nested UI structures
 * 4. Apply custom styles using CSS-in-JS
 * 5. Render all elements using DOM helper classes
 */

import { 
  FDO_SDK, 
  FDOInterface, 
  PluginMetadata,
  DOM,
  DOMText,
  DOMButton,
  DOMInput,
  DOMLink,
  DOMNested,
  DOMMisc
} from "@anikitenko/fdo-sdk";

/**
 * AdvancedDOMPlugin demonstrates advanced DOM generation capabilities.
 * 
 * Key concepts:
 * - DOM helper classes: Programmatic HTML generation
 * - CSS-in-JS: Style objects converted to CSS classes
 * - Component composition: Building complex UIs from simple elements
 * - Nested structures: Using DOMNested for containers
 */
export default class AdvancedDOMPlugin extends FDO_SDK implements FDOInterface {
  /**
   * Plugin metadata.
   * 
   * CUSTOMIZE HERE: Replace with your plugin information
   */
  private readonly _metadata: PluginMetadata = {
    name: "Advanced DOM Plugin Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates advanced DOM generation with helper classes and CSS-in-JS styling",
    icon: "icon.png"
  };

  /**
   * DOM helper instances.
   * These provide methods for creating HTML elements programmatically.
   */
  private dom: DOM;
  private domText: DOMText;
  private domButton: DOMButton;
  private domInput: DOMInput;
  private domLink: DOMLink;
  private domNested: DOMNested;
  private domMisc: DOMMisc;

  constructor() {
    super();
    
    this.dom = new DOM();
    this.domText = new DOMText();
    this.domButton = new DOMButton();
    this.domInput = new DOMInput();
    this.domLink = new DOMLink();
    this.domNested = new DOMNested();
    this.domMisc = new DOMMisc();
  }

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize the plugin.
   * 
   * COMMON PITFALL: DOM helper classes should be instantiated in the constructor,
   * not in init() or render(), to avoid unnecessary object creation.
   */
  init(): void {
    try {
      this.log("AdvancedDOMPlugin initialized!");
      
      
    } catch (error) {
      this.error(error as Error);
    }
  }

  /**
   * Render the plugin UI using DOM helper classes.
   * 
   * This example demonstrates:
   * - Creating styled elements with CSS-in-JS
   * - Building complex nested structures
   * - Composing reusable UI components
   * - Using all major DOM helper classes
   * 
   * CUSTOMIZE HERE: Replace with your own DOM generation logic
   * 
   * @returns HTML string with embedded CSS
   */
  render(): string {
    try {
      const containerStyle = {
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "800px",
        margin: "0 auto"
      };

      const header = this.createHeader();
      const infoCard = this.createInfoCard();
      const formSection = this.createFormSection();
      const buttonSection = this.createButtonSection();
      const conceptsSection = this.createConceptsSection();

      const content = this.domNested.createBlockDiv(
        { style: containerStyle },
        undefined,
        header,
        infoCard,
        formSection,
        buttonSection,
        conceptsSection
      );

      return this.dom.renderHTML(content);
      
    } catch (error) {
      this.error(error as Error);
      
      return `
        <div style="padding: 20px; color: red;">
          <h2>Error rendering plugin</h2>
          <p>An error occurred while rendering the plugin UI. Check the console for details.</p>
        </div>
      `;
    }
  }

  /**
   * Create the header section.
   * Demonstrates text element creation with styling.
   */
  private createHeader(): string {
    const titleStyle = {
      color: "#333",
      marginBottom: "10px"
    };

    const subtitleStyle = {
      color: "#666",
      fontSize: "14px",
      marginBottom: "20px"
    };

    const title = this.domText.createHText(
      1,
      this._metadata.name,
      { style: titleStyle }
    );

    const subtitle = this.domText.createPText(
      this._metadata.description,
      { style: subtitleStyle }
    );

    return title + subtitle;
  }

  /**
   * Create an info card with styled content.
   * Demonstrates nested structures and CSS-in-JS styling.
   */
  private createInfoCard(): string {
    const cardStyle = {
      backgroundColor: "#f8f9fa",
      padding: "20px",
      borderRadius: "8px",
      marginBottom: "20px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    };

    const cardTitleStyle = {
      color: "#007bff",
      marginTop: "0",
      marginBottom: "15px"
    };

    const listStyle = {
      lineHeight: "1.8",
      color: "#495057"
    };

    const cardTitle = this.domText.createHText(
      3,
      "DOM Helper Classes",
      { style: cardTitleStyle }
    );

    const description = this.domText.createPText(
      "This example uses the following DOM helper classes to generate HTML programmatically:",
      { style: { marginBottom: "10px" } }
    );

    const listItems = [
      this.domText.createLiText("DOMText - Text elements (h1-h6, p, span, strong, etc.)"),
      this.domText.createLiText("DOMButton - Button elements with click handlers"),
      this.domText.createLiText("DOMInput - Form input elements (text, checkbox, radio, etc.)"),
      this.domText.createLiText("DOMLink - Anchor elements for navigation"),
      this.domText.createLiText("DOMNested - Container elements (div, ul, form, etc.)"),
      this.domText.createLiText("DOMMisc - Miscellaneous elements (hr, etc.)")
    ];

    const list = this.domNested.createList(
      listItems,
      { style: listStyle }
    );

    return this.domNested.createBlockDiv(
      { style: cardStyle },
      undefined,
      cardTitle,
      description,
      list
    );
  }

  /**
   * Create a complex form section.
   * Demonstrates form composition with multiple input types.
   */
  private createFormSection(): string {
    const formStyle = {
      backgroundColor: "#e8f4f8",
      padding: "20px",
      borderRadius: "8px",
      marginBottom: "20px"
    };

    const formTitle = this.domText.createHText(
      3,
      "Form Example",
      { style: { marginTop: "0", marginBottom: "15px" } }
    );

    const labelStyle = {
      display: "block",
      marginBottom: "5px",
      fontWeight: "bold",
      color: "#333"
    };

    const inputStyle = {
      padding: "8px",
      width: "100%",
      marginBottom: "15px",
      border: "1px solid #ced4da",
      borderRadius: "4px",
      boxSizing: "border-box"
    };

    const nameLabel = this.domText.createLabelText(
      "Name:",
      { style: labelStyle }
    );

    const nameInput = this.domInput.createInput(
      "text",
      { 
        style: inputStyle,
        placeholder: "Enter your name",
        id: "name-input"
      }
    );

    const emailLabel = this.domText.createLabelText(
      "Email:",
      { style: labelStyle }
    );

    const emailInput = this.domInput.createInput(
      "email",
      { 
        style: inputStyle,
        placeholder: "Enter your email",
        id: "email-input"
      }
    );

    const messageLabel = this.domText.createLabelText(
      "Message:",
      { style: labelStyle }
    );

    const messageInput = this.domInput.createTextarea(
      { 
        style: { ...inputStyle, height: "100px", resize: "vertical" },
        placeholder: "Enter your message",
        id: "message-input"
      }
    );

    const notifyCheckbox = this.domInput.createInput(
      "checkbox",
      { id: "notify-checkbox", style: { marginRight: "8px" } }
    );

    const notifyLabel = this.domText.createLabelText(
      "Send me notifications",
      { style: { display: "inline", fontWeight: "normal" } }
    );

    const checkboxContainer = this.domNested.createBlockDiv(
      { style: { marginBottom: "15px" } },
      undefined,
      notifyCheckbox + notifyLabel
    );

    const submitButton = this.domButton.createButton(
      "Submit Form",
      () => { /* Handler would be registered separately */ },
      { 
        style: {
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px"
        }
      }
    );

    const formContent = this.domNested.createForm(
      { style: { marginTop: "15px" } },
      undefined,
      nameLabel,
      nameInput,
      emailLabel,
      emailInput,
      messageLabel,
      messageInput,
      checkboxContainer,
      submitButton
    );

    return this.domNested.createBlockDiv(
      { style: formStyle },
      undefined,
      formTitle,
      formContent
    );
  }

  /**
   * Create a button section.
   * Demonstrates button styling and composition.
   */
  private createButtonSection(): string {
    const sectionStyle = {
      backgroundColor: "#d4edda",
      padding: "20px",
      borderRadius: "8px",
      marginBottom: "20px"
    };

    const sectionTitle = this.domText.createHText(
      3,
      "Button Examples",
      { style: { marginTop: "0", marginBottom: "15px" } }
    );

    const primaryButton = this.domButton.createButton(
      "Primary Action",
      () => {},
      { 
        style: {
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "10px",
          marginBottom: "10px"
        }
      }
    );

    const secondaryButton = this.domButton.createButton(
      "Secondary Action",
      () => {},
      { 
        style: {
          padding: "10px 20px",
          backgroundColor: "#6c757d",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "10px",
          marginBottom: "10px"
        }
      }
    );

    const dangerButton = this.domButton.createButton(
      "Danger Action",
      () => {},
      { 
        style: {
          padding: "10px 20px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "10px"
        }
      }
    );

    const buttonContainer = this.domNested.createBlockDiv(
      { style: { marginTop: "10px" } },
      undefined,
      primaryButton,
      secondaryButton,
      dangerButton
    );

    return this.domNested.createBlockDiv(
      { style: sectionStyle },
      undefined,
      sectionTitle,
      buttonContainer
    );
  }

  /**
   * Create a concepts section.
   * Demonstrates links and dividers.
   */
  private createConceptsSection(): string {
    const sectionStyle = {
      backgroundColor: "#fff3cd",
      padding: "20px",
      borderRadius: "8px"
    };

    const sectionTitle = this.domText.createHText(
      3,
      "Key Concepts",
      { style: { marginTop: "0", marginBottom: "15px" } }
    );

    const concepts = [
      this.domText.createPText(
        this.domText.createStrongText("CSS-in-JS: ") +
        "Style objects are converted to CSS classes using goober. This provides scoped styling and prevents conflicts."
      ),
      this.domText.createPText(
        this.domText.createStrongText("Component Composition: ") +
        "Complex UIs are built by composing simple elements. Each DOM helper returns an HTML string that can be combined."
      ),
      this.domText.createPText(
        this.domText.createStrongText("Nested Structures: ") +
        "Use DOMNested.createBlockDiv() to create containers that hold multiple child elements."
      ),
      this.domText.createPText(
        this.domText.createStrongText("renderHTML(): ") +
        "This method wraps your content with a <style> tag containing all generated CSS. Always use it as the final step."
      )
    ];

    const divider = this.domMisc.divider({ 
      style: { 
        margin: "20px 0",
        border: "none",
        borderTop: "1px solid #dee2e6"
      } 
    });

    const learnMoreText = this.domText.createPText(
      "Learn more: ",
      { style: { display: "inline", marginRight: "10px" } }
    );

    const docsLink = this.domLink.createLink(
      "SDK Documentation",
      "#",
      { style: { color: "#007bff", textDecoration: "underline" } }
    );

    const linkSection = this.domNested.createBlockDiv(
      { style: { marginTop: "15px" } },
      undefined,
      learnMoreText + docsLink
    );

    return this.domNested.createBlockDiv(
      { style: sectionStyle },
      undefined,
      sectionTitle,
      ...concepts,
      divider,
      linkSection
    );
  }
}

/**
 * Key Takeaways:
 * 
 * 1. DOM helper classes provide programmatic HTML generation
 * 2. CSS-in-JS styling uses style objects that are converted to CSS classes
 * 3. Use renderHTML() to wrap content with generated CSS
 * 4. Compose complex UIs by combining simple elements
 * 5. DOMNested provides container elements for building nested structures
 * 6. All DOM helpers return HTML strings that can be concatenated
 * 7. Style objects support all standard CSS properties in camelCase
 * 
 * Common Pitfalls to Avoid:
 * - Don't forget to call renderHTML() to include generated CSS
 * - Don't instantiate DOM helpers in render() - do it in constructor
 * - Don't mix DOM helpers with raw HTML strings (use one approach consistently)
 * - Don't forget to handle errors in render() method
 * 
 * Available DOM Helper Classes:
 * - DOM: Base class with createElement(), createClassFromStyle(), renderHTML()
 * - DOMText: h1-h6, p, span, strong, em, label, li, etc.
 * - DOMButton: Button elements with click handlers
 * - DOMInput: Input, textarea, checkbox, radio, etc.
 * - DOMLink: Anchor elements
 * - DOMNested: div, ul, ol, form, fieldset, etc.
 * - DOMMisc: hr (divider), and other miscellaneous elements
 * 
 * Next Steps:
 * - Combine DOM generation with interactive handlers (example 02)
 * - Use DOM helpers with storage for dynamic UIs (example 03)
 * - Apply DOM generation to UI extensions (example 04)
 * - Create reusable UI component functions using DOM helpers
 */
