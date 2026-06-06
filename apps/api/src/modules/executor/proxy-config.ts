import { dbProvider } from '../../data/database-provider';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SecretsService } from '../secrets/secrets.service';

const secretsService = new SecretsService();

export async function getProxyConfig() {
  const settings = await dbProvider.settings.getAll();
  const proxySetting = settings.proxy as { mode: 'none' | 'manual' | 'system', host?: string, port?: number, authRefId?: string | null };

  if (!proxySetting || proxySetting.mode === 'none') {
    return null;
  }

  // System proxy
  if (proxySetting.mode === 'system') {
    const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (envProxy) {
      return new HttpsProxyAgent(envProxy);
    }
    return null;
  }

  // Manual proxy
  if (proxySetting.mode === 'manual' && proxySetting.host) {
    let authString = '';
    
    // Fetch auth if refId exists
    if (proxySetting.authRefId) {
      try {
        const secret = await secretsService.getSecret('system', proxySetting.authRefId);
        if (secret) {
          authString = `${secret}@`;
        }
      } catch (e) {
        // Fallback silently if secret is missing or keychain is locked
      }
    }

    const portStr = proxySetting.port ? `:${proxySetting.port}` : '';
    const proxyUrl = `http://${authString}${proxySetting.host}${portStr}`;
    return new HttpsProxyAgent(proxyUrl);
  }

  return null;
}
