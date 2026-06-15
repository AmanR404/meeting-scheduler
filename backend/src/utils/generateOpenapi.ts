/**
 * Writes the OpenAPI spec to ../docs/openapi.json so it can be committed and
 * hosted in the repository (as required by the deliverables). Run: `npm run docs:gen`.
 */
import fs from 'fs';
import path from 'path';
import { openapiSpec } from '../config/swagger';

const outDir = path.resolve(process.cwd(), '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'openapi.json');
fs.writeFileSync(outFile, JSON.stringify(openapiSpec, null, 2));
// eslint-disable-next-line no-console
console.log(`OpenAPI spec written to ${outFile}`);
