import { DOM, createComponentGallery, UI_COMPONENT_PREVIEWS } from '@anikitenko/fdo-sdk/ui';

/** No component controllers or plugin handlers are needed for this preview surface. */
export function staticGallery(): string {
    const dom = new DOM().collectStylesFrom();
    return dom.renderHTML(createComponentGallery(dom, { id: 'sdk-examples' }));
}
export const previewCaseCount = UI_COMPONENT_PREVIEWS.length;
