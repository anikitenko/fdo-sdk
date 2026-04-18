# Connector Broker Host Contract (Example 13)

This document defines the provider-agnostic host contract used by `examples/13-service-content-hub-plugin.ts`.
Use the same contract for SharePoint, Dropbox, Google Drive, Confluence, and internal APIs.

## Security Model

- Plugin never receives raw OAuth access/refresh tokens.
- Host owns OAuth, token refresh, token storage, and secret rotation.
- Plugin receives only opaque `sessionId` and normalized content payloads.
- Host enforces provider policy and endpoint allowlists before every connector call.
- Host logs correlation IDs for each auth/content operation.

## Host Globals

Primary generic globals:

- `globalThis.__FDO_AUTH_BROKER`
- `globalThis.__FDO_CONTENT_BROKER`

Backward-compatible aliases:

- `globalThis.__FDO_CONNECTOR_AUTH`
- `globalThis.__FDO_CONNECTOR_CONTENT`
- `globalThis.__FDO_SHAREPOINT_PROVIDER`
- `globalThis.__FDO_SHAREPOINT`

Optional browser policy broker:

- `globalThis.__FDO_BROWSER_BROKER.open({ url, policy })`

## Auth Broker Contract

```ts
type AuthBroker = {
  start(input: { providerId: string; accountHint?: string; endpointUrl?: string }): Promise<{ sessionId: string; accountId?: string }>;
  refresh(input: { providerId: string; sessionId: string }): Promise<{ sessionId?: string }>;
  logout(input: { providerId: string; sessionId: string }): Promise<void>;
};
```

## Content Broker Contract

```ts
type ContentBroker = {
  request(input: {
    providerId: string;
    sessionId: string;
    operation: "list-workspaces" | "list-items" | "search-items" | "create-share-link" | string;
    endpointUrl?: string;
    workspaceId?: string;
    path?: string;
    query?: string;
    itemId?: string;
    scope?: "organization" | "anonymous";
    type?: "view" | "edit";
    limit?: number;
    cursor?: string;
  }): Promise<{ items?: Item[]; webUrl?: string; nextCursor?: string; page?: { nextCursor?: string } } | Item[]>;
};

type Item = {
  id: string;
  name: string;
  kind: "site" | "folder" | "file" | "workspace";
  webUrl: string;
  parentPath?: string;
  lastModifiedAt?: string;
};
```

## Required Capabilities

- `system.network`
- `system.network.https`
- `system.network.scope.external-services`
- `storage`
- `storage.json`
- `system.ai`
- `system.ai.assistants.list`
- `system.ai.request`
- `system.clipboard.write`

## Error Taxonomy (Recommended)

- `AUTH_REQUIRED`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_SCOPE_DENIED`
- `ENDPOINT_URL_INVALID`
- `PROVIDER_TRANSIENT`

For transient errors (429/5xx/timeouts), host should retry with capped backoff and return a stable user-safe message.
