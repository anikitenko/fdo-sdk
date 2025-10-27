# Clarifications: Add More DOM Elements

**Feature Branch**: `001-more-dom-elements`  
**Date**: 2025-10-27  
**Related**: [spec.md](./spec.md)

## Purpose

This document captures clarifications and decisions made during the `/speckit.clarify` phase to resolve ambiguities in the feature specification.

## Clarification Questions & Resolutions

### Q1: Which DOM elements should be prioritized for implementation?

**Question**: The HTML specification includes hundreds of elements. Which specific elements are most valuable for plugin developers and should be implemented first?

**Analysis**: 
- Reviewed existing DOM classes: DOMText (21 text elements), DOMButton (1 element), DOMInput (2 elements), DOMLink (1 element), DOMNested (6 elements), DOMMisc (1 element)
- Analyzed common UI patterns in desktop applications
- Considered accessibility and semantic HTML best practices

**Resolution**: 
Focus on five categories with clear priority:
1. **P1 - Tables** (table, thead, tbody, tfoot, tr, th, td, caption): Essential for data display, most requested feature
2. **P2 - Media** (img): Required for visual interfaces, icons, logos
3. **P2 - Select dropdowns** (select, option, optgroup): Critical form control missing from current implementation
4. **P3 - Semantic elements** (article, section, nav, header, footer, aside, main): Best practices, accessibility
5. **P3 - Additional lists** (ol, dl, dt, dd): Completes list coverage

**Rationale**: Tables are the highest priority because they're fundamental for displaying structured data. Media and select elements are P2 because they're commonly needed but not as universally required. Semantic elements and additional list types are P3 because they improve code quality but aren't blocking for most use cases.

---

### Q2: Should table creation be a single method or multiple methods?

**Question**: Should developers create tables with a single `createTable()` method that accepts a data structure, or should they build tables piece by piece using separate methods for each element?

**Analysis**:
- Single method approach: Easier for simple cases, less flexible
- Multiple method approach: More flexible, follows existing DOM class patterns, allows fine-grained control

**Resolution**: 
Provide **multiple methods** for maximum flexibility:
- `createTable()` - Creates table wrapper
- `createTableHead()` - Creates thead element
- `createTableBody()` - Creates tbody element  
- `createTableFoot()` - Creates tfoot element
- `createTableRow()` - Creates tr element
- `createTableHeader()` - Creates th element
- `createTableCell()` - Creates td element
- `createCaption()` - Creates caption element

**Rationale**: This approach is consistent with existing DOM classes (e.g., DOMNested provides separate methods for ul, li, form, etc.). It gives developers maximum control over table structure and styling at each level.

---

### Q3: How should image elements handle missing or invalid src attributes?

**Question**: What should happen when a plugin developer creates an image element with an invalid or missing src attribute?

**Analysis**:
- Option 1: Throw an error and prevent element creation
- Option 2: Create the element anyway and let the browser handle it
- Option 3: Validate src and provide warnings

**Resolution**: 
**Create the element anyway** (Option 2) with proper alt text support.

**Rationale**: 
- The SDK generates HTML strings for server-side rendering; it cannot validate URLs at generation time
- Browser will handle missing/invalid images appropriately (show broken image icon or alt text)
- Plugin developers are responsible for providing valid src attributes
- Alt text is mandatory for accessibility and will display if image fails to load
- This follows the principle of "generate what's requested" rather than "validate everything"

---

### Q4: Should semantic elements enforce proper nesting rules?

**Question**: Should the SDK prevent invalid nesting of semantic elements (e.g., header inside header, main inside main)?

**Analysis**:
- Option 1: Enforce HTML5 nesting rules with validation
- Option 2: Generate requested structure without validation
- Option 3: Provide warnings but allow generation

**Resolution**: 
**Generate requested structure without validation** (Option 2).

**Rationale**:
- The SDK is a low-level HTML generation tool, not a validator
- Plugin developers are responsible for understanding HTML semantics
- Validation would add complexity and performance overhead
- Developers can use external HTML validators if needed
- Consistent with existing DOM classes which don't validate nesting
- Edge case documented in spec.md: "System should generate the requested structure, as validation is the developer's responsibility"

---

### Q5: How should select elements handle option values and labels?

**Question**: Should option elements use separate value and label parameters, or a single parameter with optional value?

**Analysis**:
- HTML option elements can have: `<option value="val">Label</option>`
- Value and label can be the same or different
- Need to support both use cases

**Resolution**: 
Provide **separate parameters** with value defaulting to label if not provided:
```typescript
createOption(label: string, value?: string, selected?: boolean, options?, id?)
```

**Rationale**:
- Flexibility: Developers can provide different value/label or use same for both
- Common pattern: Many form libraries use this approach
- Backward compatible: If value is omitted, label serves as value
- Supports selected state for default selections

---

### Q6: Should the SDK provide helper methods for common table patterns?

**Question**: Should we provide convenience methods like `createTableFromData(headers, rows)` in addition to low-level methods?

**Analysis**:
- Pro: Easier for common use cases
- Con: Adds complexity, may not cover all use cases
- Con: Inconsistent with existing DOM class patterns

**Resolution**: 
**No convenience methods in initial implementation**. Provide only low-level element creation methods.

**Rationale**:
- Keeps implementation focused and consistent with existing patterns
- Plugin developers can create their own helper functions if needed
- Low-level methods provide maximum flexibility
- Can add convenience methods in future versions based on user feedback
- Follows YAGNI principle (You Aren't Gonna Need It)

---

### Q7: How should custom attributes be handled across all new elements?

**Question**: The existing DOMNested class has a `customAttributes` option. Should all new classes support this pattern?

**Analysis**:
- DOMNested uses: `options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }>`
- This allows data-* attributes, aria-* attributes, etc.
- Important for accessibility and custom behaviors

**Resolution**: 
**Yes, all new element creation methods should support custom attributes** through the options parameter, following the DOMNested pattern.

**Rationale**:
- Consistency with existing implementation
- Essential for accessibility (aria-* attributes)
- Needed for custom data attributes (data-*)
- Allows framework integration (data-testid, etc.)
- Already established pattern in codebase

---

### Q8: Should media elements support video and audio, or just images?

**Question**: The user story mentions "media elements" - should this include video and audio elements, or just images?

**Analysis**:
- Images (img) are most commonly needed
- Video and audio are more complex (multiple source elements, controls, etc.)
- Video/audio less common in desktop application plugins
- Can be added later if needed

**Resolution**: 
**Initial implementation: images only** (img element). Video and audio can be added in future iterations if there's demand.

**Rationale**:
- Images are the most common media need (icons, logos, screenshots)
- Video/audio add significant complexity
- Follows MVP principle - start with most valuable feature
- User story focuses on "icons, logos, status indicators, preview images"
- Can extend DOMMedia class later without breaking changes

---

### Q9: How should table elements handle colspan and rowspan?

**Question**: Should th and td elements support colspan and rowspan attributes?

**Analysis**:
- Colspan and rowspan are standard HTML attributes for table cells
- Essential for complex table layouts
- Should be supported through custom attributes or dedicated parameters

**Resolution**: 
**Support through custom attributes** in the options parameter. Example:
```typescript
createTableCell(content, options: { customAttributes: { colspan: "2" } })
```

**Rationale**:
- Consistent with how other custom attributes are handled
- Doesn't require special parameters for every possible HTML attribute
- Flexible approach that works for colspan, rowspan, and any future attributes
- Keeps method signatures clean and simple

---

### Q10: Should ordered lists support custom start values and type attributes?

**Question**: HTML ordered lists support `start` (starting number) and `type` (numbering style) attributes. Should these be supported?

**Analysis**:
- `start` attribute: Sets starting number (e.g., start="5" begins at 5)
- `type` attribute: Sets numbering style (1, A, a, I, i)
- Both are valid HTML5 attributes
- Useful for complex documents

**Resolution**: 
**Support through custom attributes** in the options parameter, same as colspan/rowspan.

**Rationale**:
- Consistent approach with other special attributes
- Keeps method signatures simple
- Provides full flexibility without special-casing every HTML attribute
- Plugin developers can use: `createOrderedList(items, { customAttributes: { start: "5", type: "A" } })`

---

## Summary of Key Decisions

1. **Scope**: Five categories of elements (tables, media, select, semantic, lists) with clear priorities
2. **API Design**: Multiple low-level methods, no convenience helpers initially
3. **Validation**: No validation of nesting or attributes - developer responsibility
4. **Custom Attributes**: All elements support custom attributes through options parameter
5. **Media**: Images only in initial implementation (not video/audio)
6. **Tables**: Full support for all table elements with custom attributes for colspan/rowspan
7. **Select**: Separate value/label parameters with sensible defaults
8. **Lists**: Ordered and definition lists with custom attribute support for start/type

## Open Questions

None - all ambiguities have been resolved.

## Next Steps

Proceed to `/speckit.plan` to create detailed implementation plan based on these clarifications.
