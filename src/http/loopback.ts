/**
 * Loopback hosts, where plain http never leaves the machine (local dev):
 * `localhost`, any `*.localhost`, `[::1]` and 127.0.0.0/8. This is the one
 * copy of the rule; the proxy, the app and common-js all ask it.
 */
export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost'
    || h.endsWith('.localhost')
    || h === '[::1]'
    || /^127(\.\d{1,3}){3}$/.test(h);
}

/** Whether `url` is https, or plain http to a loopback host. */
export function isHttpsOrLoopback(url: URL): boolean {
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && isLoopbackHost(url.hostname);
}
