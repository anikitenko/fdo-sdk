# Shared plugin logic

Plugins can export named, versioned services for other plugins to reuse. For example,
a website-availability plugin can export its existing check implementation; another
plugin can call that implementation after the user explicitly approves its capability.
The code executes in the provider worker. No code, closures, private handlers or
credentials are imported into the consumer.

## Provider

Use `this.shared.register({name, version, description}, methods)` from synchronous
`init()`. `name` is a lowercase service name such as `website-availability`; `version`
is an integer major version from 1 to 9999. Only methods in the supplied object are
exported. Registering the same name/version twice fails with `CONFLICT`.

The provider declares and must be granted `plugins.shared.provide`. Network, storage,
SSH or other permissions needed by its implementation remain separate grants.
Registration returns `{ready, dispose}`. Await `ready` when other background startup
work depends on registration. The SDK observes ignored registration failures and logs
them. `dispose()` unregisters the service; plugin lifecycle shutdown does so automatically.

Each method receives `(input, {callerId, signal})`. `callerId` is the authenticated
installed consumer ID supplied by FDO, not a value chosen by the consumer. Validate
domain inputs, enforce any additional caller policy, and observe `signal` for work
that can be cancelled. Errors are returned as safe service error codes, not provider
messages or stacks.

See [the website provider](../examples/19-shared-logic-provider.ts).

## Method decorators

Use the SDK's legacy TypeScript method decorators with `experimentalDecorators: true`
to register instance methods before `init()`. They use the same capability checks,
transport and lifecycle cleanup as explicit registration:

```ts
import {FDO_SDK, handler, sharedFunction} from '@anikitenko/fdo-sdk';

class Checks extends FDO_SDK {
    @handler('checkFromUI')
    checkWebsite(input: {url: string}) {
        return {url: input.url};
    }

    @sharedFunction({service: 'website-availability', version: 1, description: 'Website checks'})
    check(input: {url: string}) {
        return {url: input.url};
    }
}
```

`@handler()` defaults to the method name; supply a string to give it an alias.
`@sharedFunction()` requires the service name, integer major version and description.
Its optional `method` supplies an exported alias, and `contract: {input, output}`
describes the method's data-only editor schema. Methods with the same service/version
are grouped into one registration; their descriptions must agree and aliases must
be unique. Static methods, accessors and reserved public names are rejected.

Registration runs once per plugin instance, after field initialization and before
`init()`. Inherited registrations use the subclass's final method and bind `this`
to the plugin instance. Do not also register the same service manually in `init()`.
Declare and approve `plugins.shared.provide` for exported methods; decorators never
grant capabilities. Shutdown disposes their shared services through the plugin scope.

`@handler()` can be stacked with `@handleError()` in either order. Registration uses
the final error-handling wrapper. That wrapper changes successful results to
`{success: true, result}`; account for this envelope in callers and any shared method
contracts when composing it with `@sharedFunction()`.

The examples compose responsive markup with SDK DOM builders, one isolated style
collector and one `renderHTML()` call per render. The consumer uses
`defineRenderOnLoadActions()` with a stable lifecycle key so repeated rendering
replaces listeners cleanly. Runtime handlers are self-contained and use the backend
bridge; provider calls stay in backend methods.

## Discover and approve

1. Start the provider and approve its export permission and any permissions its work needs.
2. Open the consumer in **Manage Plugins → Capabilities → Use shared plugin logic**.
3. Enable the base permission and select the particular exported service. Save the
   grants using the existing capability approval flow.

The service capability has this form:

`plugins.shared.call.<installed-provider-id>.<service-name>.v<major-version>`

Use `sharedLogicCapability({providerId, name, version})` to construct the exact ID.
For example: `plugins.shared.call.website-availability-provider.website-availability.v1`.
The installed ID can differ from the provider's SDK metadata ID: copy the actual ID
from discovery. The author chooses the service name; the host supplies its provider
namespace. A provider cannot register exports under another plugin's ID.

`plugins.shared.use` alone permits discovery, not method calls. There are no wildcard
grants. Approval covers every exported method in the selected service major. Export
separately named services when operations need separate consent. Approval for one
service/version does not grant another provider, another service, or a different
major version. No permissions are granted automatically.
Existing grants remain visible and removable when a provider is offline.

Only running providers are discoverable and callable. FDO does not silently start a
plugin when another plugin calls it. `this.shared.list()` returns current public
export metadata to consumers with the base use grant; it returns no implementations.
The Manage Plugins catalog refreshes while the dialog is open.

Approval trusts the provider's implementation of that service major, including
subsequent provider updates. Calls run with the provider's permissions and may cause
actions or return sensitive data. Provider code decides what data to return; consumers
do not inherit access to its files, stores, secret references or private handlers.

## Consumer

Declare both `plugins.shared.use` and the exact capability from
`sharedLogicCapability(target)`. Then use:

- `this.shared.call<Result>(target, method, input, {timeoutMs, signal})`;
- or `this.shared.client<Contract>(target).call(method, input, options)` for compile-time
  method/input/result checking against an explicitly shared TypeScript contract.

The consumer never needs to copy the provider's check implementation or receive its
network/credential configuration. See [the consumer example](../examples/20-shared-logic-consumer.ts).
TypeScript contracts do not replace the provider's runtime input validation.

## Isolation, lifecycle and limits

The host authenticates both workers and checks the intersection of current saved
grants and the worker's bootstrap grant snapshot before dispatch and before returning
a result. A newly saved grant requires the existing worker restart flow before it
can be used; a revoked grant cannot return an in-flight result. Grant changes cancel
affected calls. Worker disconnect, restart, uninstall or unregister invalidates its
exports. The same provider ID in a new session does not own old registrations.

Calls use private, correlated messages independent of the legacy UI reply queue.
Payloads and results must be finite JSON: no functions, accessors, dates, cyclic
objects or special prototype keys. Each direction is limited to 256 KiB, 32 nesting
levels and 16,384 visited values. Method names cannot be `constructor`, `prototype`,
`__proto__` or `then`. Transport messages cannot supply a caller identity.

The default deadline is 10 seconds, with a maximum of 30 seconds. Cancellation and
plugin shutdown abort the provider's signal. They cannot undo actions already performed
or forcibly stop JavaScript that ignores cancellation. Retrying a timed-out operation
may repeat effects; design mutating methods to be idempotent when appropriate.

Limits are 16 services per provider, 32 methods per service, 16 outstanding consumer
calls, 32 executions per provider worker and 128 executions in the host broker. A
provider that ignores cancellation keeps its execution slots until completion or
worker exit, preventing repeated timeouts from creating unlimited background work.
Overload returns `BACKPRESSURE`. Host audit events contain caller/provider IDs,
service/version/method and outcome codes, never argument/result contents.

Safe failure codes are `ACCESS_DENIED`, `UNAVAILABLE`, `INVALID_REQUEST`, `TIMEOUT`,
`CANCELLED`, `BACKPRESSURE`, `NOT_FOUND`, `CONFLICT` and `SERVICE_ERROR`.
A provider must be running and the host must support this protocol; otherwise calls
fail rather than falling back to importing arbitrary code.

## Verification and deployment

SDK tests cover exports, grants, typed calls, cancellation, cleanup and JSON bounds.
FDO tests exercise spoofing, version isolation, revocation, execution limits and two
real bootstrapped workers. To test an unpublished SDK with FDO, build the SDK and run
FDO's shared-worker test with `FDO_SHARED_TEST_SDK_BUNDLE` pointing at the built
`dist/fdo-sdk.bundle.js`. When FDO's installed SDK includes this API, that test uses
it automatically.

Ship the updated SDK and FDO together, then restart the workers. Existing plugins
remain private until their authors register services and the user approves the new
capabilities.


## Access requests and stopped providers

A backend handler can call `this.shared.requestAccess(target)` in response to an explicit user click.
It creates a persistent pending request; it does not grant capabilities, run the provider, or execute a shared method.
The result has `state: 'pending' | 'approved'`. Open **Manage Plugins → the consumer → Shared-service access requests**
to review the exact provider/service/version and approve or dismiss it. Approval grants `plugins.shared.use` and
only the exact `plugins.shared.call.*` capability. A running consumer restarts to load the approved grants.
The same form can create a request for an installed provider even when that provider is stopped.
Repeated pending requests for the same service are deduplicated. Dismissal leaves permissions unchanged.

Approved calls to stopped providers return `UNAVAILABLE` and FDO shows an explicit host notification naming the provider.
FDO does not automatically start a plugin or replay a failed call. Revoked or missing grants still return `ACCESS_DENIED`.

## Generated Monaco and AI contracts

Providers can include an optional data-only `contract` on their registration definition:

```ts
this.shared.register({name:'website-availability',version:1,description:'Website status',contract:{
  check:{
    input:{type:'object',properties:{url:{type:'string'}},required:['url']},
    output:{type:'object',properties:{available:{type:'boolean'},status:{type:'integer'}},required:['available','status']}
  }
}}, {check: async (input: {url:string}) => ({available:true,status:200})});
```

The supported schema vocabulary is `string`, `number`, `integer`, `boolean`, `null`, `unknown`, `array` with `items`,
and `object` with `properties` and optional `required`. It does not accept TypeScript source, references or executable metadata.
Schemas describe editor types; providers must still validate runtime inputs and ensure their implementation matches the declared contract.

FDO generates `FDOSharedServiceContracts` and service-specific `SharedLogic.client` overloads. In Monaco:

```ts
const checks = this.shared.client({providerId:'website-availability-provider',name:'website-availability',version:1});
const result = await checks.call('check',{url:'https://example.com'}); // typed status and available
```

Use a literal target or `as const` to retain its identity. Typing `this.shared.` offers registered services with
running/stopped status and required permissions. The editor refreshes the catalogue every five seconds and disposes its
libraries and completion providers when closed. These declarations are host-generated editor support, not standalone SDK globals;
export a normal interface or use `client<MyContract>` for independently built plugin projects.

Known descriptors remain discoverable while a provider is stopped, explicitly marked unavailable. Without schemas, exported
method names remain discoverable but input/output types are `unknown`. The AI coding agent receives the same bounded public
catalogue and generated signatures, and its TypeScript validation uses the same declarations. Provider descriptions are data,
not instructions. No provider implementation source, call arguments, secrets or results are included.

These optional operations require a host implementing API 1.1.0 with `sharedPluginLogicRequests` and
`sharedPluginLogicContracts`. Add the corresponding `fdo.compatibility.features` when depending on them, and require
an SDK release exposing `SharedLogic.requestAccess`. Older hosts fail unsupported requests rather than granting access.
