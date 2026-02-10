import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load .env file
dotenv.config({ override: true });

function parseBoolean(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase().trim());
}

const host = (process.env.REDIS_HOST || 'localhost').trim();
const port = Number(process.env.REDIS_PORT || 6379);
const isTls = parseBoolean(process.env.REDIS_TLS);
const isTunnelHost = host === 'localhost' || host === '127.0.0.1';

console.log(`🔍 Configuration:
  Host: ${host}
  Port: ${port}
  TLS:  ${isTls ? (isTunnelHost ? 'Enabled (Tunnel Mode)' : 'Enabled') : 'Disabled'}
`);

const redis = new Redis({
  host,
  port,
  password: process.env.REDIS_PASSWORD,
  // When tunneling to AWS via localhost, we must disable server identity check
  // because the cert is for '*.cache.amazonaws.com', not 'localhost'.
  tls: isTls
    ? {
        ...(isTunnelHost ? { checkServerIdentity: () => undefined } : {}),
      }
    : undefined,
  lazyConnect: true,
  connectTimeout: 5000,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
let lastRedisError = null;
redis.on('error', () => {
  // no-op
});
redis.on('error', (error) => {
  lastRedisError = error;
});

async function verify() {
  try {
    console.log('🔌 Connecting...');
    await redis.connect();

    const pong = await redis.ping();
    console.log('✅ Ping response:', pong);

    await redis.set('connectivity-check', 'success');
    console.log('✅ Write successful');

    const value = await redis.get('connectivity-check');
    console.log('✅ Read successful:', value);
  } catch (err) {
    const message = lastRedisError?.message || err?.message || String(err);
    console.error('\n❌ Connection failed:', message);
    if (message.includes('ECONNREFUSED')) {
      console.log("\n💡 TIP: 'ECONNREFUSED' means the target host/port is rejecting the connection.");
      console.log('   If you are on EC2, REDIS_HOST should be your ElastiCache endpoint, not localhost.');
      console.log('   If you are on a laptop, ensure an SSH tunnel is running before testing localhost.');
    }
    if (message.includes('ETIMEDOUT')) {
      console.log(
        "\n💡 TIP: 'ETIMEDOUT' usually means network path/security groups are blocking Redis traffic."
      );
      console.log('   1. Confirm EC2 -> ElastiCache security group ingress on 6379');
      console.log('   2. Confirm REDIS_TLS setting matches the cluster configuration');
    }
    if (message.includes('ENOTFOUND')) {
      console.log("\n💡 TIP: DNS lookup failed for REDIS_HOST.");
      console.log('   Verify the endpoint string and that this EC2 instance can resolve VPC private DNS.');
    }
    console.log("   3. Verify effective env: env | grep '^REDIS_'");
  } finally {
    redis.disconnect();
  }
}

verify();
