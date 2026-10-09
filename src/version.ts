/**
 * SDK version string, sent in the X-Client-Source header. Read from
 * package.json so the version has one source; `../package.json` resolves from
 * both src/ and dist/, and npm always ships package.json.
 */
import pkg from '../package.json' with { type: 'json' };

export const SDK_VERSION: string = pkg.version;
