/**
 * Live fields of a stream function.
 *
 * A stream function's input and output schemas are ordinary JSON Schemas in
 * which some properties are live: `{"type": "array", "format": "stream",
 * "items": ...}`. Their values travel over the task's socket while it runs,
 * instead of in the request body or the final output. `format: "stream"` is
 * the sibling of `format: "file"`: the same media, live instead of by
 * reference.
 *
 * On the wire a binary frame is one item of the schema's binary live field
 * (there is at most one per direction), and a JSON text frame is a partial
 * object keyed by property name: an item of a live field, or a new value for
 * an ordinary one.
 *
 * The helpers are generic over the schema type so a caller with a richer
 * JSON Schema type keeps it.
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

/** The part of JSON Schema these helpers read. */
export interface JsonSchema {
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  contentMediaType?: string;
  const?: unknown;
  items?: JsonSchema | JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  discriminator?: { propertyName?: string };
}

export function isLiveField(schema: JsonSchema | undefined | null): boolean {
  return !!schema && schema.format === STREAM_FORMAT;
}

export interface MediaType {
  /** e.g. "audio/pcm" */
  type: string;
  /** e.g. {format: "s16le", rate: "16000", channels: "1"} */
  params: Record<string, string>;
}

export function parseMediaType(value: string | undefined): MediaType | null {
  if (!value) return null;
  const [type, ...rest] = value.split(';').map((part) => part.trim());
  if (!type) return null;
  const params: Record<string, string> = {};
  for (const part of rest) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return { type: type.toLowerCase(), params };
}

export interface PCMFormat {
  sampleRate: number;
  channels: number;
}

/** The PCM format of a media type, or null when it is not 16-bit PCM audio. */
export function pcmFormat(media: MediaType | null): PCMFormat | null {
  if (!media || media.type !== 'audio/pcm') return null;
  if (media.params.format && media.params.format !== 's16le') return null;
  const sampleRate = Number(media.params.rate ?? 16000);
  const channels = Number(media.params.channels ?? 1);
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(channels) || channels <= 0) return null;
  return { sampleRate, channels };
}

export interface LiveField<S extends JsonSchema = JsonSchema> {
  key: string;
  title: string;
  description?: string;
  /** Items are binary frames. */
  binary: boolean;
  /** Set when binary. */
  media: MediaType | null;
  /**
   * What one item can be, references resolved: the alternatives of an anyOf,
   * or the single item schema. Empty for a binary field.
   */
  alternatives: S[];
  /** The property that tells the alternatives apart, when the schema names one. */
  discriminator?: string;
}

/**
 * Resolves a `#/$defs/` reference against the root, recursively. The result
 * carries no top-level `$ref` (a validator ignores a `$ref`'s siblings).
 */
function deref<S extends JsonSchema>(schema: S, root: S): S {
  if (!schema.$ref || !root.$defs) return schema;
  const name = schema.$ref.replace('#/$defs/', '');
  const target = root.$defs[name] as S | undefined;
  if (!target) return schema;
  // The reference's own fields (title, description) win over the target's.
  const { $ref: _ref, ...own } = schema;
  return { ...deref(target, root), ...own } as S;
}

function itemAlternatives<S extends JsonSchema>(items: S, root: S): S[] {
  const resolved = deref(items, root);
  const options = (resolved.anyOf ?? resolved.oneOf) as S[] | undefined;
  const alternatives = options?.length ? options.map((option) => deref(option, root)) : [resolved];
  // Each alternative must stand on its own (a form validates it without the
  // root), and nested references (an enum field, a nested model) still point
  // into the root's $defs, so they travel with it.
  return root.$defs ? alternatives.map((alternative) => ({ ...alternative, $defs: root.$defs })) : alternatives;
}

/**
 * Splits a function schema into what a form renders (the ordinary
 * properties) and what the socket carries (the live ones).
 */
export function splitLiveSchema<S extends JsonSchema>(schema: S | undefined | null): { ordinary: S | null; live: LiveField<S>[] } {
  if (!schema?.properties) return { ordinary: schema ?? null, live: [] };

  const ordinary: Record<string, S> = {};
  const live: LiveField<S>[] = [];
  for (const [key, property] of Object.entries(schema.properties as Record<string, S>)) {
    if (!isLiveField(property)) {
      ordinary[key] = property;
      continue;
    }
    const items = ((Array.isArray(property.items) ? property.items[0] : property.items) ?? {}) as S;
    const resolvedItems = deref(items, schema);
    const binary = resolvedItems.format === 'binary';
    live.push({
      key,
      title: property.title ?? key,
      description: property.description,
      binary,
      media: binary ? parseMediaType(resolvedItems.contentMediaType) : null,
      alternatives: binary ? [] : itemAlternatives(items, schema),
      discriminator: binary ? undefined : resolvedItems.discriminator?.propertyName,
    });
  }
  return {
    ordinary: { ...schema, properties: ordinary, required: schema.required?.filter((key) => key in ordinary) },
    live,
  };
}

/** The schema's one binary live field. A binary frame carries no field name. */
export function binaryLiveField<S extends JsonSchema>(live: LiveField<S>[]): LiveField<S> | null {
  return live.find((field) => field.binary) ?? null;
}

/**
 * The property whose constant names this alternative: the schema's
 * discriminator, else `type`, else the first property with a constant.
 */
export function alternativeTag(schema: JsonSchema, discriminator?: string): string | undefined {
  const constants = Object.entries(schema.properties ?? {})
    .filter(([, property]) => property && 'const' in property)
    .map(([key]) => key);
  return [discriminator, 'type', ...constants].find((key): key is string => !!key && constants.includes(key));
}

/** A label for one alternative of a JSON live field: the constant that tags it, else its title. */
export function alternativeLabel(schema: JsonSchema, index: number, discriminator?: string): string {
  const tag = alternativeTag(schema, discriminator);
  const value = tag ? schema.properties?.[tag]?.const : undefined;
  if (typeof value === 'string') return value;
  return schema.title ?? `option ${index + 1}`;
}
