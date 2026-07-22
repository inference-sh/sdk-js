import {
  AppPricing,
  EstimateCostRequest,
  EstimateCostResponse,
  ScopeAgentsRead,
  ScopeAppsRead,
  ScopeAppsWrite,
  ScopeGroupApps,
  ScopePreset,
  ScopesResponse,
} from './types';

function makeAppPricing(overrides: Partial<AppPricing> = {}): AppPricing {
  return {
    prices: { default: 1000 },
    resource_expression: 'prices.default',
    inference_expression: '0',
    royalty_expression: '0',
    partner_expression: '0',
    total_expression: 'prices.default',
    description: 'Flat rate',
    ...overrides,
  };
}

describe('EstimateCostRequest/Response', () => {
  it('models estimate requests with input payload and optional function name', () => {
    const request: EstimateCostRequest = {
      input: { prompt: 'hello', max_tokens: 256 },
      function: 'generate',
    };

    expect(request.input).toEqual({ prompt: 'hello', max_tokens: 256 });
    expect(request.function).toBe('generate');
  });

  it('models exact-confidence responses with microcents total', () => {
    const response: EstimateCostResponse = {
      confidence: 'exact',
      microcents: 2500,
      pricing_description: '$0.0025 per run',
    };

    expect(response.confidence).toBe('exact');
    expect(response.microcents).toBe(2500);
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
  });

  it('models range-confidence responses with min/max and depends_on hints', () => {
    const response: EstimateCostResponse = {
      confidence: 'range',
      min: 1000,
      max: 5000,
      depends_on: ['output_tokens', 'model_tier'],
      pricing_description: 'Depends on output length',
    };

    expect(response.confidence).toBe('range');
    expect(response.min).toBe(1000);
    expect(response.max).toBe(5000);
    expect(response.depends_on).toEqual(['output_tokens', 'model_tier']);
    expect(response.microcents).toBeUndefined();
  });

  it('models unknown-confidence responses when pricing is output-dependent', () => {
    const response: EstimateCostResponse = {
      confidence: 'unknown',
      pricing_description: 'Cost varies with generated content',
    };

    expect(response.confidence).toBe('unknown');
    expect(response.microcents).toBeUndefined();
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
    expect(response.depends_on).toBeUndefined();
  });

  it('preserves estimate request/response shapes after JSON round-trip', () => {
    const request: EstimateCostRequest = {
      input: { image_url: 'https://example.com/a.png' },
    };
    const response: EstimateCostResponse = {
      confidence: 'range',
      min: 500,
      max: 2000,
      depends_on: ['output_resolution'],
      pricing_description: 'Resolution-dependent',
    };

    const parsedRequest = JSON.parse(JSON.stringify(request)) as EstimateCostRequest;
    const parsedResponse = JSON.parse(JSON.stringify(response)) as EstimateCostResponse;

    expect(parsedRequest.input.image_url).toBe('https://example.com/a.png');
    expect(parsedResponse.confidence).toBe('range');
    expect(parsedResponse.depends_on).toEqual(['output_resolution']);
  });
});

describe('AppPricing estimate fields', () => {
  it('marks input-based pricing as estimable without a custom estimate expression', () => {
    const pricing = makeAppPricing({
      estimable: true,
      description_rendered: '$0.001 per request',
    });

    expect(pricing.estimable).toBe(true);
    expect(pricing.estimate).toBeUndefined();
  });

  it('allows a CEL estimate expression when post-execution data affects pricing', () => {
    const pricing = makeAppPricing({
      estimable: false,
      estimate: '{"min": prices.default, "max": prices.default * 10}',
      description_rendered: 'From $0.001 depending on output',
    });

    expect(pricing.estimable).toBe(false);
    expect(pricing.estimate).toContain('min');
  });

  it('preserves estimate and estimable on AppPricing after JSON round-trip', () => {
    const pricing = makeAppPricing({
      estimable: false,
      estimate: 'prices.default * task_inputs.batch_size',
    });

    const parsed = JSON.parse(JSON.stringify(pricing)) as AppPricing;

    expect(parsed.estimable).toBe(false);
    expect(parsed.estimate).toBe('prices.default * task_inputs.batch_size');
    expect(parsed.prices.default).toBe(1000);
  });
});

describe('ScopePreset summary and hidden', () => {
  it('supports summary bullets for preset scope overviews in the UI', () => {
    const preset: ScopePreset = {
      id: 'read-only',
      label: 'Read only',
      description: 'View resources without making changes',
      scopes: [ScopeAppsRead, ScopeAgentsRead],
      summary: ['View apps and agents', 'No write or execute permissions'],
    };

    expect(preset.summary).toEqual([
      'View apps and agents',
      'No write or execute permissions',
    ]);
    expect(preset.hidden).toBeUndefined();
  });

  it('supports hidden presets excluded from default UI listings', () => {
    const preset: ScopePreset = {
      id: 'legacy-full-access',
      label: 'Legacy full access',
      description: 'Internal compatibility preset',
      scopes: [],
      hidden: true,
    };

    expect(preset.hidden).toBe(true);
    expect(preset.summary).toBeUndefined();
  });

  it('preserves summary and hidden on presets nested in ScopesResponse', () => {
    const response: ScopesResponse = {
      scopes: [
        {
          value: ScopeAppsRead,
          label: 'Read apps',
          description: 'View app metadata',
          group: ScopeGroupApps,
        },
      ],
      groups: [
        {
          id: ScopeGroupApps,
          label: 'Apps',
          description: 'App store resources',
        },
      ],
      presets: [
        {
          id: 'developer',
          label: 'Developer',
          description: 'Build and run apps',
          scopes: [ScopeAppsRead, ScopeAppsWrite],
          summary: ['Read and write apps'],
          hidden: false,
        },
        {
          id: 'internal-admin',
          label: 'Internal admin',
          description: 'Hidden admin preset',
          scopes: [],
          hidden: true,
        },
      ],
    };

    const parsed = JSON.parse(JSON.stringify(response)) as ScopesResponse;

    expect(parsed.presets[0].summary).toEqual(['Read and write apps']);
    expect(parsed.presets[0].hidden).toBe(false);
    expect(parsed.presets[1].hidden).toBe(true);
    expect(parsed.presets[1].summary).toBeUndefined();
  });
});
