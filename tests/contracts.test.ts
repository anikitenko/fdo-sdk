import {
    validateHostMessageEnvelope,
    validatePluginMetadata,
    validateSerializedRenderPayload,
    validateUIMessagePayload,
} from "../src/utils/contracts";
import { MESSAGE_TYPE } from "../src/enums";

describe("SDK contract validators", () => {
    test("validates plugin metadata objects", () => {
        expect(
            validatePluginMetadata({
                name: "Example",
                version: "1.0.0",
                author: "Test",
                description: "Example plugin",
                icon: "cog",
            })
        ).toEqual({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "cog",
        });
    });

    test("rejects invalid plugin metadata", () => {
        expect(() => validatePluginMetadata(null)).toThrow("Plugin metadata must be an object.");
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "",
            author: "Test",
            description: "Example plugin",
            icon: "cog",
        })).toThrow('Plugin metadata field "version" must be a non-empty string.');
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "not-a-real-blueprint-icon",
        })).toThrow('Plugin metadata field "icon" must be a valid BlueprintJS v6 icon name. Received "not-a-real-blueprint-icon".');
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "settngs",
        })).toThrow(/Received "settngs"\. Did you mean: .*"settings"/);
    });

    test("validates serialized render payloads", () => {
        expect(
            validateSerializedRenderPayload({
                render: JSON.stringify("<div>Hello</div>"),
                onLoad: JSON.stringify("() => {}"),
            })
        ).toEqual({
            render: JSON.stringify("<div>Hello</div>"),
            onLoad: JSON.stringify("() => {}"),
        });
    });

    test("rejects invalid serialized render payloads", () => {
        expect(() => validateSerializedRenderPayload(null)).toThrow("Render payload must be an object.");
        expect(() => validateSerializedRenderPayload({
            render: 1,
            onLoad: JSON.stringify("() => {}"),
        })).toThrow('Render payload field "render" must be a string.');
    });

    test("validates host message envelopes", () => {
        expect(
            validateHostMessageEnvelope({
                message: MESSAGE_TYPE.PLUGIN_READY,
                content: { ok: true },
            })
        ).toEqual({
            message: MESSAGE_TYPE.PLUGIN_READY,
            content: { ok: true },
        });
    });

    test("rejects invalid host message envelopes", () => {
        expect(() => validateHostMessageEnvelope(null)).toThrow("Host message must be an object.");
        expect(() => validateHostMessageEnvelope({ message: "UNKNOWN" })).toThrow("Host message type is invalid.");
    });

    test("validates UI message payloads", () => {
        expect(
            validateUIMessagePayload({
                handler: "customHandler",
                content: "test-data",
            })
        ).toEqual({
            handler: "customHandler",
            content: "test-data",
        });

        expect(validateUIMessagePayload(undefined)).toEqual({});
    });

    test("rejects invalid UI message payloads", () => {
        expect(() => validateUIMessagePayload("bad-payload")).toThrow("UI message payload must be an object.");
        expect(() => validateUIMessagePayload({ handler: 1 })).toThrow(
            'UI message payload field "handler" must be a string when provided.'
        );
    });
});
