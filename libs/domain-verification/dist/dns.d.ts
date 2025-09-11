import { DNSQueryResult, DNSRecordType } from './types';
export declare class DNSService {
    private dnsServers?;
    private defaultTimeout;
    constructor(dnsServers?: string[], timeout?: number);
    /**
     * Query DNS records for a domain
     */
    queryRecords(domain: string, recordType: DNSRecordType, timeout?: number): Promise<DNSQueryResult>;
    /**
     * Query TXT records specifically
     */
    queryTXTRecords(domain: string, timeout?: number): Promise<string[]>;
    /**
     * Query MX records
     */
    queryMXRecords(domain: string, timeout?: number): Promise<string[]>;
    /**
     * Query A records
     */
    queryARecords(domain: string, timeout?: number): Promise<string[]>;
    /**
     * Check if domain exists (has any DNS records)
     */
    domainExists(domain: string, timeout?: number): Promise<boolean>;
    /**
     * Perform the actual DNS query with timeout
     */
    private performDNSQuery;
    /**
     * Reverse DNS lookup
     */
    reverseLookup(ip: string, timeout?: number): Promise<string[]>;
    /**
     * Get all DNS servers currently configured
     */
    getDNSServers(): string[];
    /**
     * Set DNS servers
     */
    setDNSServers(servers: string[]): void;
    /**
     * Reset DNS servers to system default
     */
    resetDNSServers(): void;
    /**
     * Test DNS server connectivity
     */
    testDNSServer(server: string, timeout?: number): Promise<boolean>;
}
//# sourceMappingURL=dns.d.ts.map