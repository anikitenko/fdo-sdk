import { PluginMetadata } from "../PluginMetadata";
import { MESSAGE_TYPE } from "../enums";
import { BLUEPRINT_V6_ICON_NAMES, isBlueprintV6IconName } from "./blueprintIcons";

export interface HostMessageEnvelope {
    message: MESSAGE_TYPE;
    content?: unknown;
}

export interface UIMessagePayload {
    handler?: string;
    content?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object";
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Plugin metadata field "${fieldName}" must be a non-empty string.`);
    }

    return value;
}

export function validatePluginMetadata(metadata: unknown): PluginMetadata {
    if (!isRecord(metadata)) {
        throw new Error("Plugin metadata must be an object.");
    }

    const candidate = metadata;

    return {
        id: candidate.id === undefined ? undefined : requireNonEmptyString(candidate.id, "id"),
        name: requireNonEmptyString(candidate.name, "name"),
        version: requireNonEmptyString(candidate.version, "version"),
        author: requireNonEmptyString(candidate.author, "author"),
        description: requireNonEmptyString(candidate.description, "description"),
        icon: validateBlueprintIconName(candidate.icon),
    };
}

function validateBlueprintIconName(value: unknown): string {
    const icon = requireNonEmptyString(value, "icon");

    if (!isBlueprintV6IconName(icon)) {
        const suggestions = getClosestBlueprintIconNames(icon);
        const suggestionSuffix = suggestions.length > 0
            ? ` Did you mean: ${suggestions.map((name) => `"${name}"`).join(", ")}?`
            : "";
        throw new Error(
            `Plugin metadata field "icon" must be a valid BlueprintJS v6 icon name. Received "${icon}".${suggestionSuffix}`
        );
    }

    return icon;
}

function getClosestBlueprintIconNames(input: string): string[] {
    const normalizedInput = input.toLowerCase();
    const rankedIcons = Array.from(BLUEPRINT_V6_ICON_NAMES)
        .map((iconName) => ({
            iconName,
            score: scoreBlueprintIconMatch(normalizedInput, iconName),
        }))
        .sort((left, right) => {
            if (left.score !== right.score) {
                return left.score - right.score;
            }
            return left.iconName.localeCompare(right.iconName);
        });

    return rankedIcons
        .filter((entry) => entry.score <= 5)
        .slice(0, 3)
        .map((entry) => entry.iconName);
}

function scoreBlueprintIconMatch(input: string, candidate: string): number {
    if (candidate === input) {
        return 0;
    }

    if (candidate.includes(input) || input.includes(candidate)) {
        return Math.abs(candidate.length - input.length);
    }

    return levenshteinDistance(input, candidate);
}

function levenshteinDistance(left: string, right: string): number {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    for (let row = 0; row < rows; row += 1) {
        matrix[row][0] = row;
    }

    for (let col = 0; col < cols; col += 1) {
        matrix[0][col] = col;
    }

    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1;
            matrix[row][col] = Math.min(
                matrix[row - 1][col] + 1,
                matrix[row][col - 1] + 1,
                matrix[row - 1][col - 1] + substitutionCost
            );
        }
    }

    return matrix[left.length][right.length];
}

export function validateSerializedRenderPayload(payload: unknown): { render: string; onLoad: string } {
    if (!isRecord(payload)) {
        throw new Error("Render payload must be an object.");
    }

    const candidate = payload;

    if (typeof candidate.render !== "string") {
        throw new Error('Render payload field "render" must be a string.');
    }

    if (typeof candidate.onLoad !== "string") {
        throw new Error('Render payload field "onLoad" must be a string.');
    }

    return {
        render: candidate.render,
        onLoad: candidate.onLoad,
    };
}

export function validateHostMessageEnvelope(message: unknown): HostMessageEnvelope {
    if (!isRecord(message)) {
        throw new Error("Host message must be an object.");
    }

    if (!Object.values(MESSAGE_TYPE).includes(message.message as MESSAGE_TYPE)) {
        throw new Error("Host message type is invalid.");
    }

    return {
        message: message.message as MESSAGE_TYPE,
        content: message.content,
    };
}

export function validateUIMessagePayload(payload: unknown): UIMessagePayload {
    if (payload === undefined) {
        return {};
    }

    if (!isRecord(payload)) {
        throw new Error("UI message payload must be an object.");
    }

    if (payload.handler !== undefined && typeof payload.handler !== "string") {
        throw new Error('UI message payload field "handler" must be a string when provided.');
    }

    return {
        handler: payload.handler as string | undefined,
        content: payload.content,
    };
}
