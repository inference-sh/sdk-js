import { alternativeLabel, binaryLiveField, isLiveField, parseMediaType, pcmFormat, splitLiveSchema, type JsonSchema } from './schema';

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
    expect(events.alternatives.map(alternativeLabel)).toEqual(['interrupt', 'text']);
    expect(events.alternatives[1].required).toEqual(['text']);
    // No top-level $ref: a validator ignores its siblings.
    expect(events.alternatives.every((alternative) => !('$ref' in alternative))).toBe(true);
    // Nested references still resolve: the root's $defs travel with each alternative.
    expect(events.alternatives.every((alternative) => alternative.$defs === talkInput.$defs)).toBe(true);
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
