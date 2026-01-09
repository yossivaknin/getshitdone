#!/usr/bin/env node

/**
 * Auto-detect working IP address and update Capacitor config
 * Maintains multiple IPs and tries to find which one works
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// IPs to maintain
const IPs = ['192.168.1.70', '192.168.1.34'];
const PORT = 3000;

function testIP(ip) {
  try {
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://${ip}:${PORT}/app`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim() === '200';
  } catch (error) {
    return false;
  }
}

function findWorkingIP() {
  console.log('🔍 Testing IP addresses...');
  for (const ip of IPs) {
    console.log(`  Testing ${ip}...`);
    if (testIP(ip)) {
      console.log(`✅ Found working IP: ${ip}`);
      return ip;
    }
  }
  
  // If none work, use the first one
  console.log(`⚠️  No working IP found, using first: ${IPs[0]}`);
  return IPs[0];
}

function updateCapacitorConfig(workingIP) {
  const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Update the getServerUrl function to return the working IP
  const newFunction = `function getServerUrl(): string {
  // List of IPs to try (add more as needed)
  const ips = [${IPs.map(ip => `'${ip}'`).join(', ')}];
  const port = 3000;
  
  // Auto-detected working IP: ${workingIP}
  // Update this script if IPs change: npm run update-capacitor-ip
  return \`http://${workingIP}:\${port}\`;
}`;
  
  // Replace the function
  content = content.replace(
    /function getServerUrl\(\): string \{[\s\S]*?\n\}/,
    newFunction
  );
  
  fs.writeFileSync(configPath, content, 'utf8');
  console.log(`✅ Updated capacitor.config.ts to use: ${workingIP}`);
}

// Main
const workingIP = findWorkingIP();
updateCapacitorConfig(workingIP);
console.log('\n✅ Done! Run "npx cap sync ios" to apply changes.');
