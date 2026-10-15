import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { PluginRegistry } from "../src/PluginRegistry";

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
    for (const name of ['__FDO_AI_REQUEST', '__FDO_SESSION_REQUEST', '__FDO_BROWSER_BROKER']) delete (globalThis as any)[name];
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

describe('Service content hub validation and broker failure scenarios', () => {
    const context = { providerId: 'custom-api', endpointUrl: 'https://content.example.test', sessionId: 'session', workspaceId: 'workspace' };
    const call = (name: string, payload: unknown = context) => PluginRegistry.callHandler(`serviceHub.v1.${name}`, payload);
    const grantNetwork = () => PluginRegistry.configureCapabilities({ granted: ['system.network', 'system.network.https', 'system.network.scope.external-services'] });
    beforeEach(() => { new ServiceContentHubPlugin(); grantNetwork(); });
    test.each([
        ['content.listWorkspaces', {}, 'SESSION_REQUIRED'],
        ['content.listItems', {}, 'CONTEXT_REQUIRED'],
        ['content.search', { sessionId: 'session', query: '' }, 'SEARCH_INPUT_INVALID'],
        ['auth.refresh', {}, 'SESSION_REQUIRED'],
        ['auth.logout', {}, 'SESSION_REQUIRED'],
    ])('%s validates missing required context', async (handler, payload, code) => {
        expect(await call(handler as string, payload)).toMatchObject({ ok: false, code });
    });
    test('normalizes and persists context, rejects unsafe endpoints, and stores favorites by identity', async () => {
        expect(await call('saveContext', { ...context, accountId: ' user ', path: '/documents', authConfig: { clientId: 'client', tenantId: 'tenant' } })).toMatchObject({ ok: true, context: { accountId: 'user', authClientId: 'client' } });
        expect(await call('saveContext', { ...context, endpointUrl: 'file:///etc/hosts' })).toMatchObject({ ok: false, code: 'ENDPOINT_URL_INVALID' });
        expect(await call('addFavorite', { item: { id: 'doc', name: 'Document', webUrl: 'https://content.example.test/doc' } })).toMatchObject({ ok: true });
        expect(await call('addFavorite', { item: { id: 'doc', name: 'Document' } })).toMatchObject({ ok: true });
        const prepared = await call('prepare') as any; expect(prepared.favorites).toHaveLength(1); expect(prepared.context.authClientId).toBe('client');
    });
    test('auth start/refresh/logout persist session transitions and clear authentication state', async () => {
        const start = vi.fn().mockResolvedValue({ sessionId: 'session-new', accountId: 'user' });
        const refresh = vi.fn().mockResolvedValue({ sessionId: 'session-refreshed' }); const logout = vi.fn().mockResolvedValue({});
        (globalThis as any).__FDO_AUTH_BROKER = { start, refresh, logout };
        expect(await call('auth.start')).toMatchObject({ ok: true, sessionId: 'session-new' });
        expect(await call('auth.refresh', { ...context, sessionId: 'session-new' })).toMatchObject({ ok: true, sessionId: 'session-refreshed', authDeviceCode: '' });
        expect(await call('auth.logout', { ...context, sessionId: 'session-refreshed' })).toMatchObject({ ok: true });
        expect((await call('prepare') as any).context.sessionId).toBe(''); expect(logout).toHaveBeenCalledTimes(1);
    });
    test.each([
        ['token expired', 'AUTH_TOKEN_EXPIRED'], ['permission denied 403', 'AUTH_SCOPE_DENIED'], ['401 unauthorized', 'AUTH_REQUIRED'], ['invalid payload', 'AUTH_START_FAILED'],
    ])('auth start classifies %s without exposing a false success', async (message, code) => {
        (globalThis as any).__FDO_AUTH_BROKER = { start: vi.fn().mockRejectedValue(Error(message)) };
        expect(await call('auth.start')).toMatchObject({ ok: false, code, error: expect.stringContaining(message) });
    });
    test('missing brokers, missing sessions and empty provider responses are actionable failures', async () => {
        expect(await call('auth.start')).toMatchObject({ ok: false, code: 'AUTH_START_FAILED' });
        (globalThis as any).__FDO_AUTH_BROKER = { start: vi.fn().mockResolvedValue({}) };
        expect(await call('auth.start')).toMatchObject({ ok: false, code: 'AUTH_START_FAILED' });
        (globalThis as any).__FDO_AUTH_BROKER.start.mockResolvedValue({ ok: false, code: 'CONSENT_DENIED', error: 'Consent denied' });
        expect(await call('auth.start')).toMatchObject({ ok: false, code: 'CONSENT_DENIED' });
    });
    test('content results normalize provider data, persist pagination and build share links through an explicit broker', async () => {
        const request = vi.fn().mockResolvedValue({ items: [{ id: 'doc', name: 'Document', webUrl: 'https://content.example.test/doc' }, null, { name: 'No id' }], nextCursor: 'page-2' });
        (globalThis as any).__FDO_CONTENT_BROKER = { request };
        for (const handler of ['content.listWorkspaces', 'content.listItems', 'content.search']) {
            const result = await call(handler, { ...context, query: 'Document', cursor: 'page-1' }) as any;
            expect(result).toMatchObject({ ok: true, nextCursor: 'page-2' }); expect(result.items[0]).toMatchObject({ id: 'doc', name: 'Document' });
        }
        request.mockResolvedValue({ webUrl: 'https://content.example.test/shared' });
        expect(await call('content.createShareLink', { ...context, itemId: 'doc' })).toMatchObject({ ok: true, webUrl: 'https://content.example.test/shared' });
        request.mockResolvedValue({}); expect(await call('content.createShareLink', { ...context, itemId: 'doc' })).toMatchObject({ ok: false, code: 'CREATE_SHARE_LINK_FAILED' });
    });
    test('content upstream failures retain classified codes and never invoke an implicit browser', async () => {
        (globalThis as any).__FDO_CONTENT_BROKER = { request: vi.fn().mockRejectedValue(Error('403 forbidden')) };
        expect(await call('content.listItems')).toMatchObject({ ok: false, code: 'AUTH_SCOPE_DENIED' });
        expect(await call('openBrowser', { webUrl: 'javascript:alert(1)' })).toMatchObject({ ok: false, code: 'ENDPOINT_URL_INVALID' });
        const open = vi.fn().mockResolvedValue({ ok: true }); (globalThis as any).__FDO_BROWSER_BROKER = { open };
        expect(await call('openBrowser', { webUrl: 'https://content.example.test/doc' })).toMatchObject({ ok: true }); expect(open).toHaveBeenCalledTimes(1);
    });
    test('AI provider success, fallback, malformed replies and failures remain deterministic', async () => {
        expect(await PluginRegistry.callHandler('fdo.ai.request.v1', { summary: { count: 3 } })).toMatchObject({ ok: true, source: 'fallback', message: expect.stringContaining('3 result') });
        (globalThis as any).__FDO_AI_REQUEST = vi.fn().mockResolvedValue({ text: 'Summary' });
        expect(await PluginRegistry.callHandler('fdo.ai.request.v1', {})).toMatchObject({ ok: true, source: 'fdo-ai', message: 'Summary' });
        (globalThis as any).__FDO_AI_REQUEST.mockRejectedValue(Error('Provider down'));
        expect(await PluginRegistry.callHandler('fdo.ai.request.v1', {})).toMatchObject({ ok: false, code: 'AI_ASSIST_FAILED' });
        (globalThis as any).__FDO_AI_LIST_ASSISTANTS = vi.fn().mockRejectedValue(Error('Discovery down'));
        expect(await PluginRegistry.callHandler('fdo.ai.assistants.list.v1', {})).toMatchObject({ ok: false, code: 'AI_ASSISTANTS_LIST_FAILED' });
    });
});
