/**
 * The live socket's wire protocol. sdk-py (inferencesh/models/stream.py)
 * mirrors all of it and sdk-js-app (src/stream.ts) mirrors CLEAR_KEY and
 * ERROR_KEY; change the copies together.
 */

export const STREAM_FORMAT = 'stream';

// Control frames. Reserved keys start with `$`, which no field name can, so a
// control frame is never mistaken for an output field.

/** `{"$clear": "audio"}`: drop what has been buffered of a live output field. */
export const CLEAR_KEY = '$clear';
/**
 * `{"$error": {"field": ..., "message": ...}}`: a refused frame, or anything
 * else the caller should be told went wrong. The stream goes on.
 */
export const ERROR_KEY = '$error';

/**
 * `{"$relay": "waiting" | "paired"}`: written by the relay, not the app, to a
 * client that dialed with `?signals=paired`. "waiting" on attach says this
 * relay reports pairing; "paired" says the worker is there.
 */
export const RELAY_KEY = '$relay';

/**
 * Relay close codes that mean "dial again". 1012: the relay is restarting and
 * closed an end that still waited for its peer. 1013: the peer did not come in
 * time. Neither means anything once frames have flowed.
 */
export const REDIAL_CODES: ReadonlySet<number> = new Set([1012, 1013]);
