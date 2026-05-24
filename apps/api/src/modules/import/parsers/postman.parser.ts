/**
 * Postman Collection v2.1 Parser.
 * Recursively processes items → separates folders and requests.
 */

interface PostmanCollection {
  info: { name: string; description?: string; schema: string };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string }>;
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[];       // Folder (recursive)
  request?: PostmanRequest;   // Request
}

interface PostmanRequest {
  method: string;
  url: string | { raw: string; host?: string[]; path?: string[]; query?: Array<{ key: string; value: string }> };
  header?: Array<{ key: string; value: string; disabled?: boolean }>;
  body?: { mode: string; raw?: string; formdata?: unknown[]; urlencoded?: unknown[] };
  auth?: unknown;
}

export interface ParsedFolder {
  name: string;
  parentPath: string;
}

export interface ParsedRequest {
  name: string;
  folderPath: string;
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; description: string; enabled: boolean }>;
  params: Array<{ key: string; value: string; description: string; enabled: boolean }>;
  body: { mode: string; content: string };
  auth: { type: string; config: Record<string, unknown> };
}

export interface ParsedCollection {
  name: string;
  description: string;
  folders: ParsedFolder[];
  requests: ParsedRequest[];
}

export function parsePostmanCollection(json: PostmanCollection): ParsedCollection {
  const result: ParsedCollection = {
    name: json.info?.name || 'Imported Collection',
    description: json.info?.description || '',
    folders: [],
    requests: [],
  };

  function processItems(items: PostmanItem[], parentPath: string = ''): void {
    items.forEach((item) => {
      if (item.item && Array.isArray(item.item)) {
        // It's a folder
        const folderPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        result.folders.push({ name: item.name, parentPath });
        processItems(item.item, folderPath);
      } else if (item.request) {
        // It's a request
        const req = item.request;

        // Parse URL
        let url = '';
        const params: ParsedRequest['params'] = [];
        if (typeof req.url === 'string') {
          url = req.url;
        } else if (req.url) {
          url = req.url.raw || '';
          if (req.url.query) {
            req.url.query.forEach((q) => {
              params.push({
                key: q.key,
                value: q.value || '',
                description: '',
                enabled: true,
              });
            });
          }
        }

        // Parse headers
        const headers = (req.header || []).map((h) => ({
          key: h.key,
          value: h.value || '',
          description: '',
          enabled: !h.disabled,
        }));

        // Parse body
        let body: ParsedRequest['body'] = { mode: 'none', content: '' };
        if (req.body) {
          if (req.body.mode === 'raw' && req.body.raw) {
            body = { mode: 'json', content: req.body.raw };
            try {
              JSON.parse(req.body.raw);
            } catch {
              body.mode = 'raw';
            }
          }
        }

        result.requests.push({
          name: item.name,
          folderPath: parentPath,
          method: req.method || 'GET',
          url,
          headers,
          params,
          body,
          auth: { type: 'none', config: {} },
        });
      }
    });
  }

  processItems(json.item || []);
  return result;
}
