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
