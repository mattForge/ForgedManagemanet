/**
 * ForgeManager Network Discovery Probe
 * -----------------------------------
 * This script is meant to run locally on an office server.
 * It scans the local network and reports discovered devices to the cloud.
 * 
 * Prerequisites:
 * 1. Node.js installed
 * 2. nmap installed on the host system (sudo apt install nmap)
 * 3. npm install axios
 */

const { exec } = require('child_process');
const axios = require('axios');

// --- CONFIGURATION ---
const CLOUD_API_URL = 'https://ais-dev-ly37pvkc4bxsrqzlzmcl7h-617649030299.europe-west2.run.app/api/network/ingest';
const API_KEY = 'forge_discovery_secret_2026'; // Must match server.ts
const ORGANIZATION_ID = 'YOUR_ORG_ID_HERE'; // Replace with your actual Org ID
const TARGET_SUBNET = '192.168.1.0/24'; // Adjust to your local network
const SCAN_INTERVAL_MS = 1000 * 60 * 15; // Scan every 15 minutes

console.log('>>> ForgeManager Network Probe Started');
console.log(`>>> Target: ${TARGET_SUBNET}`);
console.log(`>>> Interval: ${SCAN_INTERVAL_MS / 1000 / 60} minutes`);

async function runDiscovery() {
    console.log(`\n[${new Date().toISOString()}] Starting network scan...`);

    // Using nmap for discovery:
    // -sn: Ping scan (disable port scan)
    // -oX -: Output in XML format (or we can use -oG for greppable)
    // For simplicity in this script, we'll parse the standard output or use a simpler nmap command
    
    const nmapCommand = `nmap -sn ${TARGET_SUBNET}`;

    exec(nmapCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`!!! NMAP ERROR: ${error.message}`);
            return;
        }

        const devices = parseNmapOutput(stdout);
        console.log(`[*] Discovered ${devices.length} devices. Sending to cloud...`);

        try {
            const response = await axios.post(CLOUD_API_URL, {
                organization_id: ORGANIZATION_ID,
                devices: devices
            }, {
                headers: { 'x-api-key': API_KEY }
            });
            console.log(`[+] Success: ${response.data.message} (${response.data.count} devices processed)`);
        } catch (err) {
            console.error(`!!! TRANSMISSION ERROR: ${err.response?.data?.error || err.message}`);
        }
    });
}

function parseNmapOutput(output) {
    const devices = [];
    const lines = output.split('\n');
    let currentDevice = null;

    // Simple regex-based parsing for nmap -sn output
    // Example line: Nmap scan report for hostname (192.168.1.5)
    // Example line: MAC Address: 00:11:22:33:44:55 (Vendor Name)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('Nmap scan report for')) {
            const match = line.match(/for (?:(.+) )?\(?([\d\.]+)\)?/);
            if (match) {
                currentDevice = {
                    hostname: match[1] || 'Unknown',
                    ip: match[2],
                    mac: null,
                    vendor: 'Unknown'
                };
                devices.push(currentDevice);
            }
        } else if (line.startsWith('MAC Address:') && currentDevice) {
            const match = line.match(/MAC Address: ([0-9A-F:]+) \((.+)\)/i);
            if (match) {
                currentDevice.mac = match[1];
                currentDevice.vendor = match[2];
            }
        }
    }

    // Filter out devices without MAC (often the scanning host itself)
    return devices.filter(d => d.mac !== null);
}

// Run immediately then on interval
runDiscovery();
setInterval(runDiscovery, SCAN_INTERVAL_MS);
