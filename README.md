# cf-ddns

![cf-ddns Logo Header](cf-ddns-header.png)

## About

**cf-ddns** is a quick and basic Node.JS application which acts like a Dynamic DNS client for Cloudflare® DNS.  
It fetches your machine's IPv4 address using [ipify](https://www.ipify.org/), and updates your Cloudflare DNS records specified using `domains.json`. If the record doesn't exist, it will be created automatically.

cf-ddns was inspired by Scott Helme's [CloudflareDDNS](https://github.com/ScottHelme/CloudFlareDDNS) and performs similar functions, but does not require external hosting.

## Installation

- Run `npm install` to install the dependencies (`dotenv-safe` and `axios`)
- Create a `.env` file based on `.env.example`
- Configure the `.env` and `domains.json`
- Run `node index.js`
- (Recommended) Use a process manager like `nodemon` or `pm2` to keep cf-ddns running

## Configuration

### `.env`

#### CF_API_TOKEN

A Cloudflare API token.  
You can manage your API tokens from [the Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens).  
cf-ddns requires 2 permissions: Read Zone.Zone, Edit Zone.DNS

#### CF_DDNS_REFRESH_INTERVAL

The refresh interval for cf-ddns, in seconds.  
Default is `30`.  
Do take note of Cloudflare API rate limits when changing the value (1200 requests / 5 minutes).

### `domains.json`

A domain object consists of a `name` string and `subdomains` array of strings.  
`name` is the root domain as listed in Cloudflare DNS (e.g. `example.com`)  
`subdomains` contains the subdomains that you wish to update the A DNS records of (e.g. `blog.example.com`, or `example.com` to update the root domain)  
When using multiple subdomains, I suggest having only 1 A record pointing to the IPv4 address, then create aliases like CNAMEs pointing to that A record.

---

*Cloudflare is a registered trademark of Cloudflare, Inc.*
