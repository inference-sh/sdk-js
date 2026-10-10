import * as main from '../index';
import { isHttpsOrLoopback, isLoopbackHost } from './loopback';

/**
 * Shared https-or-loopback rule (293ad13): proxy refuses plain http except
 * to loopback hosts so API keys are not sent over the network in cleartext.
 */
describe('isLoopbackHost / isHttpsOrLoopback', () => {
  it('exports the helpers from the main barrel', () => {
    expect(main.isLoopbackHost).toBe(isLoopbackHost);
    expect(main.isHttpsOrLoopback).toBe(isHttpsOrLoopback);
  });

  it('treats localhost, *.localhost, 127.0.0.0/8 and [::1] as loopback', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('LOCALHOST')).toBe(true);
    expect(isLoopbackHost('api.localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('127.255.255.255')).toBe(true);
    expect(isLoopbackHost('[::1]')).toBe(true);
  });

  it('rejects non-loopback hostnames', () => {
    expect(isLoopbackHost('192.168.1.1')).toBe(false);
    expect(isLoopbackHost('api.inference.sh')).toBe(false);
    expect(isLoopbackHost('evil.localhost.com')).toBe(false);
  });

  it('allows https to any host and http only to loopback', () => {
    expect(isHttpsOrLoopback(new URL('https://api.inference.sh/path'))).toBe(true);
    expect(isHttpsOrLoopback(new URL('http://127.0.0.1:8787'))).toBe(true);
    expect(isHttpsOrLoopback(new URL('http://localhost:3000'))).toBe(true);
    expect(isHttpsOrLoopback(new URL('http://api.inference.sh'))).toBe(false);
  });
});
