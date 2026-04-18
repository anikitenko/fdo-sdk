import { HostsRecord } from "@anikitenko/fdo-sdk";

export interface HostEnvironment {
    id: string;
    name: string;
    active: boolean;
    records: HostsRecord[];
}

export class HostsLogic {
    private environments: HostEnvironment[] = [
        {
            id: "local-dev",
            name: "Local Development",
            active: true,
            records: [
                { address: "127.0.0.1", hostname: "dev.local", comment: "Main dev entry" },
                { address: "127.0.0.1", hostname: "api.local" }
            ]
        },
        {
            id: "staging",
            name: "Staging Environment",
            active: false,
            records: [
                { address: "192.168.1.50", hostname: "staging.myapp.com" }
            ]
        }
    ];

    getEnvironments(): HostEnvironment[] {
        return this.environments;
    }

    toggleEnvironment(id: string): void {
        const env = this.environments.find(e => e.id === id);
        if (env) {
            env.active = !env.active;
        }
    }

    getActiveRecords(): HostsRecord[] {
        return this.environments
            .filter(e => e.active)
            .flatMap(e => e.records);
    }
}
