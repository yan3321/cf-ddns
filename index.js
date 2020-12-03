// Require dependencies
require('dotenv-safe').config();
const axios = require('axios').default;
const domains = require('./domains.json').domains;

// Get our environment variables
const cfAPIToken = process.env.CF_API_TOKEN;
const refreshInterval = process.env.CF_DDNS_REFRESH_INTERVAL * 1000

// API endpoints
const ipv4Endpoint = 'https://api.ipify.org?format=json';
const cfBaseEndpoint = 'https://api.cloudflare.com/client/v4/';

// Store the IPv4 address in a variable
let currentIPv4;

// Get the zone ID from the given root domain
async function getZoneIdFromDomain(domain) {
    return new Promise((resolve, reject) => {
        axios.request({
                url: '/zones',
                method: 'GET',
                baseURL: cfBaseEndpoint,
                headers: {
                    'Authorization': 'Bearer ' + cfAPIToken,
                    'Content-Type': 'application/json'
                },
                params: {
                    name: domain
                },
                responseType: 'json'
            })
            .then((response) => {
                // console.dir(response.data);
                const zoneResult = response.data.result[0];
                const zoneName = zoneResult.name;
                const zoneId = zoneResult.id;
                console.log(`Zone ID for ${domain} found! ID: ${zoneId}`);
                resolve(zoneId);
            })
            .catch((error) => {
                console.log(`Error occured while getting zone ID for ${domain}`);
                console.error(error);
                if (error.response) {
                    console.error(error.response.data);
                }
                reject();
            });
    });
}

// Creates a new DNS A record for a subdomain with the current IPv4 address
async function createDNSRecordFromZoneIdAndSubdomain(zoneId, subdomain) {
    return new Promise((resolve, reject) => {
        axios.request({
                url: '/zones/' + zoneId + '/dns_records',
                method: 'POST',
                baseURL: cfBaseEndpoint,
                headers: {
                    'Authorization': 'Bearer ' + cfAPIToken,
                    'Content-Type': 'application/json'
                },
                data: {
                    type: 'A',
                    name: subdomain,
                    content: currentIPv4,
                    ttl: 1,
                    proxied: true,
                },
                responseType: 'json'
            })
            .then((response) => {
                // console.dir(response.data);
                const result = response.data.result;
                const dnsRecord = result;
                console.log(`${subdomain} DNS record created!`);
                resolve(dnsRecord);
            })
            .catch((error) => {
                console.log(`Error occured while creating DNS record for ${subdomain}`);
                console.error(error);
                if (error.response) {
                    console.error(error.response.data);
                }
                reject(error);
            });
    });
}

// Updates a given DNS record with the current IPv4 address
async function patchDNSRecord(zoneId, dnsRecordId) {
    return new Promise((resolve, reject) => {
        axios.request({
                url: '/zones/' + zoneId + '/dns_records/' + dnsRecordId,
                method: 'PATCH',
                baseURL: cfBaseEndpoint,
                headers: {
                    'Authorization': 'Bearer ' + cfAPIToken,
                    'Content-Type': 'application/json'
                },
                data: {
                    content: currentIPv4,
                },
                responseType: 'json'
            })
            .then((response) => {
                // console.dir(response.data);
                const result = response.data.result;
                const dnsRecord = result;
                console.log(`${subdomain} DNS record patched!`);
                resolve(dnsRecord);
            })
            .catch((error) => {
                console.log(`Error occured while getting updating DNS record for ${dnsRecordId}`);
                console.error(error);
                if (error.response) {
                    console.error(error.response.data);
                }
                reject(error);
            });
    });
}

// Gets the DNS record for a given subdomain, creates a new record if not found
async function getDNSRecordsFromZoneIdAndSubdomain(zoneId, subdomain) {
    return new Promise((resolve, reject) => {
        axios.request({
                url: '/zones/' + zoneId + '/dns_records',
                method: 'GET',
                baseURL: cfBaseEndpoint,
                headers: {
                    'Authorization': 'Bearer ' + cfAPIToken,
                    'Content-Type': 'application/json'
                },
                params: {
                    type: 'A',
                    name: subdomain
                },
                responseType: 'json'
            })
            .then((response) => {
                // console.dir(response.data);
                const result = response.data.result;
                const dnsRecord = result[0];
                if (!dnsRecord) {
                    // If record doesn't exist, create a new one.
                    console.log(`DNS A record for ${subdomain} does not exist, attempting to create...`);
                    createDNSRecordFromZoneIdAndSubdomain(zoneId, subdomain)
                        .then((dnsRecord) => {
                            resolve(dnsRecord);
                        })
                        .catch((error) => {
                            reject(error);
                        })
                } else {
                    const recordId = dnsRecord.id;
                    const recordIPv4 = dnsRecord.content;
                    console.log(`DNS A record for ${subdomain} found! ID: ${recordId} IP: ${recordIPv4}`);
                    resolve(dnsRecord);
                }
            })
            .catch((error) => {
                console.error(error);
                if (error.response) {
                    console.error(error.response.data);
                }
                reject(error);
            });
    });
}

// Use iplify to get our current IPv4 address
async function getCurrentIPv4() {
    return new Promise((resolve, reject) => {
        axios.request({
                url: ipv4Endpoint,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'json'
            })
            .then((response) => {
                currentIPv4 = response.data.ip;
                console.log(`Our IPv4 address as detected by iplify is ${currentIPv4}`);
                resolve(currentIPv4);
            })
            .catch((error) => {
                if (error.response) {
                    console.error(error.response.data);
                }
                reject(error);
            });
    });
}

async function checker() {
    // Get our current IPv4 address
    getCurrentIPv4()
        .then(() => {
            // Using the domain data in domains.json, we check each domain object with Cloudflare
            domains.forEach((domainObject) => {
                const domainName = domainObject.name;
                const subdomains = domainObject.subdomains;
                // Get the zone ID from the root domain
                getZoneIdFromDomain(domainName)
                    .then((zoneId) => {
                        // Iterate through the subdomains to fetch their DNS records, and create them if they don't exist
                        subdomains.forEach((subdomain) => {
                            getDNSRecordsFromZoneIdAndSubdomain(zoneId, subdomain)
                                .then((dnsRecord) => {
                                    const dnsRecordId = dnsRecord.id;
                                    const dnsRecordIPv4 = dnsRecord.content;
                                    // If our machine's current IPv4 doesn't match the Cloudflare records, update the Cloudflare record
                                    if (dnsRecordIPv4 != currentIPv4) {
                                        patchDNSRecord(zoneId, dnsRecordId);
                                    }
                                });
                        })
                    });
            });
        });
}

// Run this check at the given refresh interval
checker()
setInterval(checker, refreshInterval)