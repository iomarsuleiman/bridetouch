import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';

const html = readFileSync(new URL('../src/index.html', import.meta.url));
const packed = brotliCompressSync(html, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).toString('base64');
const code = `const packed=${JSON.stringify(packed)};
const decoded=atob(packed);
const page=new Uint8Array(decoded.length);
for(let i=0;i<decoded.length;i++)page[i]=decoded.charCodeAt(i);
export default {
  async fetch(request) {
    if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});
    const path=new URL(request.url).pathname;
    if(path==="/favicon.ico")return new Response(null,{status:204});
    const headers=new Headers({"Content-Type":"text/html; charset=utf-8","Content-Encoding":"br","Vary":"Accept-Encoding","Cache-Control":"public, max-age=300, no-transform","X-Content-Type-Options":"nosniff"});
    return new Response(request.method==="HEAD"?null:page,{status:200,headers,encodeBody:"manual"});
  }
};
`;
writeFileSync(new URL('../worker.js', import.meta.url), code);
console.log(`Generated worker.js from ${html.length} bytes of HTML`);
