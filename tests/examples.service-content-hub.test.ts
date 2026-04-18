import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { PluginRegistry } from "../src/PluginRegistry";

vi.mock("@anikitenko/fdo-sdk", async () => {
    return await import("../src/index");
});

let ServiceContentHubPlugin: typeof import("../examples/13-service-content-hub-plugin").default;

beforeAll(async () => {
    (global as any).process.parentPort = {
        on: vi.fn(),
        postMessage: vi.fn(),
    };
    ServiceContentHubPlugin = (await import("../examples/13-service-content-hub-plugin")).default;
});

beforeEach(() => {
    PluginRegistry.clearAllHandlers();
    PluginRegistry.clearPlugin();
    PluginRegistry.configureStorage({ rootDir: undefined });
    PluginRegistry.configureCapabilities({ granted: [] });
    delete (globalThis as { __FDO_CONTENT_BROKER?: unknown }).__FDO_CONTENT_BROKER;
    delete (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER;
    delete (globalThis as { __FDO_AI_LIST_ASSISTANTS?: unknown }).__FDO_AI_LIST_ASSISTANTS;
});

describe("Service content hub example handlers", () => {
    test("prepare uses session fallback when json store capability is unavailable", async () => {
        new ServiceContentHubPlugin();

        const response = await PluginRegistry.callHandler("serviceHub.v1.prepare", {});

        expect(response).toMatchObject({
            ok: true,
            storageMode: "session-fallback",
        });
    });

    test("list workspaces validates malformed endpoint url", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const response = await PluginRegistry.callHandler("serviceHub.v1.content.listWorkspaces", {
            providerId: "custom-api",
            sessionId: "session-1",
            endpointUrl: "invalid-url",
        });

        expect(response).toMatchObject({
            ok: false,
            code: "ENDPOINT_URL_INVALID",
        });
    });

    test("list workspaces retries transient provider failures and normalizes response", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: [
                "system.network",
                "system.network.https",
                "system.network.scope.external-services",
                "storage",
            ],
        });

        const request = vi
            .fn()
            .mockRejectedValueOnce(new Error("429 throttled"))
            .mockResolvedValueOnce({
                items: [
                    {
                        id: "site-1",
                        name: "Engineering",
                        kind: "site",
                        webUrl: "https://contoso.sharepoint.com/sites/engineering",
                    },
                ],
                nextCursor: "cursor-2",
            });
        (globalThis as { __FDO_CONTENT_BROKER?: unknown }).__FDO_CONTENT_BROKER = { request };

        const response = await PluginRegistry.callHandler("serviceHub.v1.content.listWorkspaces", {
            providerId: "sharepoint",
            sessionId: "session-1",
            endpointUrl: "https://contoso.sharepoint.com",
            query: "eng",
        });

        expect(request).toHaveBeenCalledTimes(2);
        expect(response).toMatchObject({
            ok: true,
            nextCursor: "cursor-2",
            items: [
                {
                    id: "site-1",
                    name: "Engineering",
                    kind: "site",
                },
            ],
        });
        expect((response as { correlationId?: unknown }).correlationId).toEqual(expect.stringMatching(/^list-workspaces-/));
    });

    test("sharepoint workspace fallback requires query or site id when no broker is available", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: [
                "system.network",
                "system.network.https",
                "system.network.scope.external-services",
                "storage",
            ],
        });

        const request = vi.fn();
        (globalThis as { __FDO_SESSION_REQUEST?: unknown }).__FDO_SESSION_REQUEST = { request };

        const response = await PluginRegistry.callHandler("serviceHub.v1.content.listWorkspaces", {
            providerId: "sharepoint",
            sessionId: "session-1",
            endpointUrl: "https://graph.microsoft.com/v1.0",
        });

        expect(request).not.toHaveBeenCalled();
        expect(response).toMatchObject({
            ok: false,
            code: "LIST_WORKSPACES_FAILED",
        });
        expect((response as { error?: unknown }).error).toEqual(
            expect.stringContaining("requires either a search query or a SharePoint Site ID")
        );
    });

    test("ai assistants handler uses host canonical global name", async () => {
        new ServiceContentHubPlugin();
        (globalThis as { __FDO_AI_LIST_ASSISTANTS?: unknown }).__FDO_AI_LIST_ASSISTANTS = vi.fn().mockResolvedValue({
            assistants: [{ id: "assistant-1", name: "Default Assistant" }],
        });

        const response = await PluginRegistry.callHandler("fdo.ai.assistants.list.v1", { purpose: "automation" });

        expect(response).toMatchObject({
            ok: true,
            source: "fdo-ai",
            assistants: [{ id: "assistant-1", name: "Default Assistant" }],
        });
    });

    test("auth start requests sharepoint device code flow and returns pending verification payload", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const start = vi.fn().mockResolvedValue({
            ok: true,
            sessionId: "session-device-1",
            authTxnId: "auth-txn-device-1",
            raw: {
                verification_uri: "https://microsoft.com/devicelogin",
                user_code: "ABCD-EFGH",
                device_code: "device-code-1",
                interval: 5,
                expires_in: 900,
                message: "Open microsoft.com/devicelogin and enter the code.",
            },
            accountId: "user@contoso.com",
        });
        (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER = { start };

        const response = await PluginRegistry.callHandler("serviceHub.v1.auth.start", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
            authConfig: {
                clientId: "client-id-123",
                tenantId: "common",
            },
        });

        expect(start).toHaveBeenCalledTimes(1);
        expect(start.mock.calls[0]?.[0]).toMatchObject({
            providerId: "sharepoint",
            endpointUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode",
            request: {
                url: "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode",
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
            },
        });
        expect(response).toMatchObject({
            ok: true,
            pending: true,
            sessionId: "session-device-1",
            accountId: "user@contoso.com",
            verificationUri: "https://microsoft.com/devicelogin",
            userCode: "ABCD-EFGH",
        });
    });

    test("auth start keeps pending when broker marks interaction required with nested redirect url", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const start = vi.fn().mockResolvedValue({
            requiresInteraction: true,
            session: { id: "session-provisional-1" },
            auth: { url: "https://idp.example.com/authorize?flow=device" },
        });
        (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER = { start };

        const response = await PluginRegistry.callHandler("serviceHub.v1.auth.start", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
        });

        expect(response).toMatchObject({
            ok: true,
            pending: true,
            sessionId: "session-provisional-1",
            authorizationUrl: "https://idp.example.com/authorize?flow=device",
        });
    });

    test("auth start keeps pending when host transport wraps provider payload in raw", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const start = vi.fn().mockResolvedValue({
            ok: true,
            authTxnId: "auth-txn-1",
            providerId: "sharepoint",
            sessionId: "plugin-auth:session-1",
            raw: {
                authorizeUrl: "https://idp.example.com/oauth2/authorize?txn=abc",
                state: "pending",
            },
        });
        (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER = { start };

        const response = await PluginRegistry.callHandler("serviceHub.v1.auth.start", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
        });

        expect(response).toMatchObject({
            ok: true,
            pending: true,
            sessionId: "plugin-auth:session-1",
            authorizationUrl: "https://idp.example.com/oauth2/authorize?txn=abc",
        });
    });

    test("auth start keeps pending when host returns transport envelope without raw payload", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const start = vi.fn().mockResolvedValue({
            ok: true,
            authTxnId: "auth-txn-2",
            providerId: "sharepoint",
            sessionId: "plugin-auth:session-2",
            raw: null,
        });
        (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER = { start };

        const response = await PluginRegistry.callHandler("serviceHub.v1.auth.start", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
        });

        expect(response).toMatchObject({
            ok: true,
            pending: true,
            sessionId: "plugin-auth:session-2",
            authTxnId: "auth-txn-2",
        });
    });

    test("auth refresh polls microsoft token endpoint for sharepoint device code flow", async () => {
        new ServiceContentHubPlugin();
        PluginRegistry.configureCapabilities({
            granted: ["system.network", "system.network.https", "system.network.scope.external-services"],
        });

        const plugin = new ServiceContentHubPlugin();
        await PluginRegistry.callHandler("serviceHub.v1.saveContext", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
            sessionId: "session-device-2",
            authConfig: {
                clientId: "client-id-123",
                tenantId: "organizations",
            },
            authDeviceCode: "device-code-2",
            authVerificationUri: "https://microsoft.com/devicelogin",
            authUserCode: "ZXCV-BNMQ",
        });

        void plugin;
        const start = vi.fn().mockResolvedValue({
            ok: true,
            providerId: "sharepoint",
            sessionId: "session-device-2",
            raw: {
                access_token: "token-123",
                token_type: "Bearer",
                expires_in: 3600,
            },
        });
        (globalThis as { __FDO_AUTH_BROKER?: unknown }).__FDO_AUTH_BROKER = { refresh: start };

        const response = await PluginRegistry.callHandler("serviceHub.v1.auth.refresh", {
            providerId: "sharepoint",
            endpointUrl: "https://graph.microsoft.com/v1.0",
            sessionId: "session-device-2",
        });

        expect(start).toHaveBeenCalledTimes(2);
        expect(start.mock.calls[0]?.[0]).toMatchObject({
            providerId: "sharepoint",
            sessionId: "session-device-2",
            request: {
                url: "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
            },
        });
        expect(start.mock.calls[1]?.[0]).toMatchObject({
            providerId: "sharepoint",
            sessionId: "session-device-2",
            auth: {
                scheme: "bearer",
                value: "token-123",
            },
            credentials: {
                accessToken: "token-123",
                tokenType: "Bearer",
            },
        });
        expect(response).toMatchObject({
            ok: true,
            sessionId: "session-device-2",
            authDeviceCode: "",
        });
    });
});
