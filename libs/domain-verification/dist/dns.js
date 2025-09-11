"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DNSService = void 0;
const dns_1 = require("dns");
const types_1 = require("./types");
class DNSService {
    constructor(dnsServers, timeout = 10000) {
        this.dnsServers = dnsServers;
        this.defaultTimeout = timeout;
        // Configure DNS servers if provided
        if (dnsServers && dnsServers.length > 0) {
            dns_1.promises.setServers(dnsServers);
        }
    }
    /**
     * Query DNS records for a domain
     */
    async queryRecords(domain, recordType, timeout) {
        const startTime = Date.now();
        const queryTimeout = timeout || this.defaultTimeout;
        try {
            const records = await this.performDNSQuery(domain, recordType, queryTimeout);
            const queryTime = Date.now() - startTime;
            return {
                domain,
                recordType,
                records,
                queryTime,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw new types_1.DNSError(`DNS query failed for ${domain} (${recordType}): ${error.message}`, { domain, recordType, originalError: error });
        }
    }
    /**
     * Query TXT records specifically
     */
    async queryTXTRecords(domain, timeout) {
        try {
            const result = await this.queryRecords(domain, types_1.DNSRecordType.TXT, timeout);
            return result.records.map(record => record.value);
        }
        catch (error) {
            throw new types_1.DNSError(`Failed to query TXT records for ${domain}: ${error.message}`, { domain, originalError: error });
        }
    }
    /**
     * Query MX records
     */
    async queryMXRecords(domain, timeout) {
        try {
            const result = await this.queryRecords(domain, types_1.DNSRecordType.MX, timeout);
            return result.records.map(record => record.value);
        }
        catch (error) {
            throw new types_1.DNSError(`Failed to query MX records for ${domain}: ${error.message}`, { domain, originalError: error });
        }
    }
    /**
     * Query A records
     */
    async queryARecords(domain, timeout) {
        try {
            const result = await this.queryRecords(domain, types_1.DNSRecordType.A, timeout);
            return result.records.map(record => record.value);
        }
        catch (error) {
            throw new types_1.DNSError(`Failed to query A records for ${domain}: ${error.message}`, { domain, originalError: error });
        }
    }
    /**
     * Check if domain exists (has any DNS records)
     */
    async domainExists(domain, timeout) {
        try {
            // Try to resolve any record type
            const promises = [
                this.queryARecords(domain, timeout).catch(() => []),
                this.queryMXRecords(domain, timeout).catch(() => []),
                this.queryTXTRecords(domain, timeout).catch(() => [])
            ];
            const results = await Promise.all(promises);
            return results.some(records => records.length > 0);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Perform the actual DNS query with timeout
     */
    async performDNSQuery(domain, recordType, timeout) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new types_1.TimeoutError(`DNS query timeout after ${timeout}ms`));
            }, timeout);
            try {
                let records = [];
                switch (recordType) {
                    case types_1.DNSRecordType.A:
                        const aRecords = await dns_1.promises.resolve4(domain);
                        records = aRecords.map(ip => ({
                            name: domain,
                            type: types_1.DNSRecordType.A,
                            value: ip
                        }));
                        break;
                    case types_1.DNSRecordType.AAAA:
                        const aaaaRecords = await dns_1.promises.resolve6(domain);
                        records = aaaaRecords.map(ip => ({
                            name: domain,
                            type: types_1.DNSRecordType.AAAA,
                            value: ip
                        }));
                        break;
                    case types_1.DNSRecordType.MX:
                        const mxRecords = await dns_1.promises.resolveMx(domain);
                        records = mxRecords.map(mx => ({
                            name: domain,
                            type: types_1.DNSRecordType.MX,
                            value: `${mx.priority} ${mx.exchange}`
                        }));
                        break;
                    case types_1.DNSRecordType.TXT:
                        const txtRecords = await dns_1.promises.resolveTxt(domain);
                        records = txtRecords.map(txt => ({
                            name: domain,
                            type: types_1.DNSRecordType.TXT,
                            value: Array.isArray(txt) ? txt.join('') : txt
                        }));
                        break;
                    case types_1.DNSRecordType.CNAME:
                        const cnameRecords = await dns_1.promises.resolveCname(domain);
                        records = cnameRecords.map(cname => ({
                            name: domain,
                            type: types_1.DNSRecordType.CNAME,
                            value: cname
                        }));
                        break;
                    case types_1.DNSRecordType.NS:
                        const nsRecords = await dns_1.promises.resolveNs(domain);
                        records = nsRecords.map(ns => ({
                            name: domain,
                            type: types_1.DNSRecordType.NS,
                            value: ns
                        }));
                        break;
                    case types_1.DNSRecordType.SOA:
                        const soaRecord = await dns_1.promises.resolveSoa(domain);
                        records = [{
                                name: domain,
                                type: types_1.DNSRecordType.SOA,
                                value: `${soaRecord.nsname} ${soaRecord.hostmaster} ${soaRecord.serial} ${soaRecord.refresh} ${soaRecord.retry} ${soaRecord.expire} ${soaRecord.minttl}`
                            }];
                        break;
                    default:
                        throw new types_1.DNSError(`Unsupported record type: ${recordType}`);
                }
                clearTimeout(timeoutId);
                resolve(records);
            }
            catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    /**
     * Reverse DNS lookup
     */
    async reverseLookup(ip, timeout) {
        const queryTimeout = timeout || this.defaultTimeout;
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new types_1.TimeoutError(`Reverse DNS lookup timeout after ${queryTimeout}ms`));
            }, queryTimeout);
            try {
                const hostnames = await dns_1.promises.reverse(ip);
                clearTimeout(timeoutId);
                resolve(hostnames);
            }
            catch (error) {
                clearTimeout(timeoutId);
                reject(new types_1.DNSError(`Reverse DNS lookup failed for ${ip}: ${error.message}`, { ip, originalError: error }));
            }
        });
    }
    /**
     * Get all DNS servers currently configured
     */
    getDNSServers() {
        return dns_1.promises.getServers();
    }
    /**
     * Set DNS servers
     */
    setDNSServers(servers) {
        this.dnsServers = servers;
        dns_1.promises.setServers(servers);
    }
    /**
     * Reset DNS servers to system default
     */
    resetDNSServers() {
        this.dnsServers = undefined;
        // Reset to system default by setting empty array then getting servers
        dns_1.promises.setServers([]);
    }
    /**
     * Test DNS server connectivity
     */
    async testDNSServer(server, timeout) {
        const originalServers = this.getDNSServers();
        try {
            // Temporarily set to test server
            dns_1.promises.setServers([server]);
            // Try to resolve a known domain
            await this.queryARecords('google.com', timeout || 5000);
            return true;
        }
        catch (error) {
            return false;
        }
        finally {
            // Restore original servers
            dns_1.promises.setServers(originalServers);
        }
    }
}
exports.DNSService = DNSService;
//# sourceMappingURL=dns.js.map