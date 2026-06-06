import { generateCurl } from '../../utils/curl-generator';

export class CodeGenService {
  generateCode(target: string, request: any, redactSecrets: boolean) {
    let auth = request.auth;
    
    if (redactSecrets) {
      auth = JSON.parse(JSON.stringify(request.auth || {}));
      if (auth.bearer?.token) auth.bearer.token = '<REDACTED_TOKEN>';
      if (auth.basic?.password) auth.basic.password = '<REDACTED_PASSWORD>';
      if (auth.apiKey?.value) auth.apiKey.value = '<REDACTED_API_KEY>';
    }

    const reqData = { ...request, auth };

    switch (target) {
      case 'curl':
        return generateCurl(reqData);
      case 'javascript-fetch':
        return this.generateFetch(reqData);
      case 'python-requests':
        return this.generatePython(reqData);
      case 'go-nethttp':
        return this.generateGo(reqData);
      default:
        throw new Error('Unsupported target');
    }
  }

  private generateFetch(req: any) {
    let code = `const options = {\n  method: '${req.method}',\n`;
    
    const headers: Record<string, string> = {};
    if (req.headers) {
      req.headers.forEach((h: any) => {
        if (h.key) headers[h.key] = h.value;
      });
    }

    // Add Auth
    if (req.auth?.type === 'bearer' && req.auth.bearer?.token) {
      headers['Authorization'] = `Bearer ${req.auth.bearer.token}`;
    } else if (req.auth?.type === 'basic') {
      const b = req.auth.basic;
      headers['Authorization'] = `Basic \${btoa('${b.username || ''}:${b.password || ''}')}`;
    }

    if (Object.keys(headers).length > 0) {
      code += `  headers: ${JSON.stringify(headers, null, 4).replace(/\\n/g, '\n  ')},\n`;
    }

    if (req.body?.mode === 'raw') {
      code += `  body: ${JSON.stringify(req.body.content)},\n`;
    }

    code += `};\n\n`;
    code += `fetch('${req.url}', options)\n`;
    code += `  .then(response => response.json())\n`;
    code += `  .then(response => console.log(response))\n`;
    code += `  .catch(err => console.error(err));`;

    return code;
  }

  private generatePython(req: any) {
    let code = `import requests\n\n`;
    code += `url = "${req.url}"\n\n`;
    
    if (req.body?.mode === 'raw') {
      code += `payload = ${JSON.stringify(req.body.content)}\n`;
    } else {
      code += `payload = ""\n`;
    }

    const headers: Record<string, string> = {};
    if (req.headers) {
      req.headers.forEach((h: any) => {
        if (h.key) headers[h.key] = h.value;
      });
    }

    if (req.auth?.type === 'bearer' && req.auth.bearer?.token) {
      headers['Authorization'] = `Bearer ${req.auth.bearer.token}`;
    } else if (req.auth?.type === 'basic') {
      const b = req.auth.basic;
      // In python requests, we'd use auth=(user, pass), but for simplicity we'll just add the header here if not doing proper auth
      const b64 = Buffer.from(`${b.username || ''}:${b.password || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }

    if (Object.keys(headers).length > 0) {
      code += `headers = ${JSON.stringify(headers, null, 4)}\n\n`;
    } else {
      code += `headers = {}\n\n`;
    }

    code += `response = requests.request("${req.method}", url, headers=headers, data=payload)\n\n`;
    code += `print(response.text)\n`;

    return code;
  }

  private generateGo(req: any) {
    let code = `package main\n\n`;
    code += `import (\n\t"fmt"\n\t"strings"\n\t"net/http"\n\t"io/ioutil"\n)\n\n`;
    code += `func main() {\n\n`;
    code += `\turl := "${req.url}"\n\n`;

    if (req.body?.mode === 'raw') {
      code += `\tpayload := strings.NewReader(${JSON.stringify(req.body.content)})\n\n`;
      code += `\treq, _ := http.NewRequest("${req.method}", url, payload)\n\n`;
    } else {
      code += `\treq, _ := http.NewRequest("${req.method}", url, nil)\n\n`;
    }

    if (req.headers) {
      req.headers.forEach((h: any) => {
        if (h.key) {
          code += `\treq.Header.Add("${h.key}", "${h.value}")\n`;
        }
      });
    }

    if (req.auth?.type === 'bearer' && req.auth.bearer?.token) {
      code += `\treq.Header.Add("Authorization", "Bearer ${req.auth.bearer.token}")\n`;
    } else if (req.auth?.type === 'basic') {
      const b = req.auth.basic;
      const b64 = Buffer.from(`${b.username || ''}:${b.password || ''}`).toString('base64');
      code += `\treq.Header.Add("Authorization", "Basic ${b64}")\n`;
    }

    code += `\n\tres, _ := http.DefaultClient.Do(req)\n`;
    code += `\tdefer res.Body.Close()\n`;
    code += `\tbody, _ := ioutil.ReadAll(res.Body)\n\n`;
    code += `\tfmt.Println(string(body))\n`;
    code += `}\n`;

    return code;
  }
}
