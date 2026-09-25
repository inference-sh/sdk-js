import { alternativeLabel, alternativeTag, binaryLiveField, isLiveField, parseMediaType, pcmFormat, splitLiveSchema, type JsonSchema } from './schema';

// What pydantic emits for voice-loop-like models (inferencesh >= 0.8.1).
const talkInput: JsonSchema = {
  type: 'object',
  $defs: {
    Interrupt: { type: 'object', title: 'Interrupt', properties: { type: { const: 'interrupt', type: 'string' } } },
    UserText: {
      type: 'object',
      title: 'UserText',
      required: ['text'],
      properties: { type: { const: 'text', type: 'string' }, text: { type: 'string' } },
    },
  },
  required: ['voice'],
  properties: {
    voice: { type: 'string', default: 'ara' } as JsonSchema,
    audio: {
      type: 'array',
      format: 'stream',
      title: 'Audio',
      description: 'Microphone audio',
      items: { type: 'string', format: 'binary', contentMediaType: 'audio/pcm;format=s16le;rate=16000;channels=1' },
    },
    events: {
      type: 'array',
      format: 'stream',
      items: { anyOf: [{ $ref: '#/$defs/Interrupt' }, { $ref: '#/$defs/UserText' }] },
    },
  },
};

describe('splitLiveSchema', () => {
  it('separates what a form renders from what the socket carries', () => {
    const { ordinary, live } = splitLiveSchema(talkInput);
    expect(Object.keys(ordinary!.properties!)).toEqual(['voice']);
    expect(ordinary!.required).toEqual(['voice']);
    expect(live.map((field) => field.key)).toEqual(['audio', 'events']);
  });

  it('describes a binary field by its media type', () => {
    const audio = binaryLiveField(splitLiveSchema(talkInput).live)!;
    expect(audio.key).toBe('audio');
    expect(audio.title).toBe('Audio');
    expect(audio.description).toBe('Microphone audio');
    expect(pcmFormat(audio.media)).toEqual({ sampleRate: 16000, channels: 1 });
    expect(audio.alternatives).toEqual([]);
  });

  it('resolves the alternatives of a JSON field through $defs', () => {
    const events = splitLiveSchema(talkInput).live[1];
    expect(events.binary).toBe(false);
    expect(events.alternatives.map((alternative, index) => alternativeLabel(alternative, index))).toEqual(['interrupt', 'text']);
    expect(events.alternatives[1].required).toEqual(['text']);
    // No top-level $ref: a validator ignores its siblings.
    expect(events.alternatives.every((alternative) => !('$ref' in alternative))).toBe(true);
    // Nested references still resolve: the root's $defs travel with each alternative.
    expect(events.alternatives.every((alternative) => alternative.$defs === talkInput.$defs)).toBe(true);
  });

  it('keeps nested $ref fields on an alternative when the root $defs travel with it', () => {
    const schema: JsonSchema = {
      type: 'object',
      $defs: {
        Tag: { type: 'string', const: 'a' },
        Message: { type: 'object', properties: { tag: { $ref: '#/$defs/Tag' } } },
      },
      properties: {
        events: {
          type: 'array',
          format: 'stream',
          items: { anyOf: [{ $ref: '#/$defs/Message' }] },
        },
      },
    };
    const [message] = splitLiveSchema(schema).live[0].alternatives;
    expect(message.$defs).toBe(schema.$defs);
    expect(message.properties?.tag).toEqual({ $ref: '#/$defs/Tag' });
    expect('$ref' in message).toBe(false);
  });

  it('leaves a schema without live fields alone', () => {
    const plain: JsonSchema = { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] };
    const { ordinary, live } = splitLiveSchema(plain);
    expect(live).toEqual([]);
    expect(ordinary!.properties).toEqual(plain.properties);
    expect(ordinary!.required).toEqual(['prompt']);
    expect(splitLiveSchema(null)).toEqual({ ordinary: null, live: [] });
  });

  it('labels an alternative by its type const, else its title, else its position', () => {
    expect(alternativeLabel({ title: 'Word' }, 0)).toBe('Word');
    expect(alternativeLabel({}, 2)).toBe('option 3');
    expect(isLiveField({ format: 'file' })).toBe(false);
  });

  it('resolves oneOf $ref alternatives without leaving $ref on the result', () => {
    const schema: JsonSchema = {
      type: 'object',
      $defs: {
        Ping: { type: 'object', title: 'Ping', properties: { type: { const: 'ping', type: 'string' } } },
        Pong: { type: 'object', title: 'Pong', properties: { type: { const: 'pong', type: 'string' } } },
      },
      properties: {
        events: {
          type: 'array',
          format: 'stream',
          items: { oneOf: [{ $ref: '#/$defs/Ping' }, { $ref: '#/$defs/Pong' }] },
        },
      },
    };
    const events = splitLiveSchema(schema).live[0];
    expect(events.alternatives.map((alternative, index) => alternativeLabel(alternative, index))).toEqual(['ping', 'pong']);
    expect(events.alternatives.every((alternative) => !('$ref' in alternative))).toBe(true);
  });

  it('lets fields on a $ref override the target and still drops the $ref', () => {
    const schema: JsonSchema = {
      type: 'object',
      $defs: {
        Base: { type: 'object', title: 'FromDef', description: 'from def' },
      },
      properties: {
        events: {
          type: 'array',
          format: 'stream',
          items: {
            anyOf: [{ $ref: '#/$defs/Base', title: 'Overlay', description: 'from ref' }],
          },
        },
      },
    };
    const [alternative] = splitLiveSchema(schema).live[0].alternatives;
    expect(alternative.title).toBe('Overlay');
    expect(alternative.description).toBe('from ref');
    expect('$ref' in alternative).toBe(false);
  });

  it('follows nested $defs references until fully expanded', () => {
    const schema: JsonSchema = {
      type: 'object',
      $defs: {
        Outer: { $ref: '#/$defs/Inner', title: 'Outer' },
        Inner: { type: 'object', properties: { value: { type: 'string' } } },
      },
      properties: {
        payload: {
          type: 'array',
          format: 'stream',
          items: { $ref: '#/$defs/Outer' },
        },
      },
    };
    const [alternative] = splitLiveSchema(schema).live[0].alternatives;
    expect(alternative.title).toBe('Outer');
    expect(alternative.properties?.value).toEqual({ type: 'string' });
    expect('$ref' in alternative).toBe(false);
  });
});

describe('media types', () => {
  it('parses parameters', () => {
    expect(parseMediaType('audio/pcm; rate=24000;channels=2')).toEqual({ type: 'audio/pcm', params: { rate: '24000', channels: '2' } });
    expect(parseMediaType(undefined)).toBeNull();
  });

  it('reads PCM only from 16-bit PCM audio', () => {
    expect(pcmFormat(parseMediaType('audio/pcm;format=s16le;rate=24000'))).toEqual({ sampleRate: 24000, channels: 1 });
    expect(pcmFormat(parseMediaType('audio/pcm;format=f32le;rate=24000'))).toBeNull();
    expect(pcmFormat(parseMediaType('image/jpeg'))).toBeNull();
    expect(pcmFormat(null)).toBeNull();
  });
});

describe('discriminated items', () => {
  it('labels alternatives by the property the schema discriminates on', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          format: 'stream',
          items: { oneOf: [{ $ref: '#/$defs/Ask' }, { $ref: '#/$defs/Stop' }], discriminator: { propertyName: 'kind' } },
        },
      },
      $defs: {
        Ask: { type: 'object', properties: { kind: { const: 'ask' }, q: { type: 'string' } } },
        Stop: { type: 'object', title: 'Stop', properties: { kind: { const: 'stop' } } },
      },
    };
    const events = splitLiveSchema(schema).live[0];
    expect(events.discriminator).toBe('kind');
    expect(events.alternatives.map((alternative, index) => alternativeLabel(alternative, index, events.discriminator))).toEqual(['ask', 'stop']);
    expect(alternativeTag(events.alternatives[0], events.discriminator)).toBe('kind');
  });

  it('falls back to `type`, then to the first constant property, then the title', () => {
    expect(alternativeLabel({ properties: { type: { const: 'text' } } }, 0)).toBe('text');
    expect(alternativeLabel({ properties: { op: { const: 'ping' } } }, 0)).toBe('ping');
    expect(alternativeLabel({ title: 'Plain' }, 3)).toBe('Plain');
  });
});
