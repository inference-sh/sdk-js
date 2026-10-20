import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import type { InstancePriceHistoryPointDTO } from '../types.js';

/**
 * GET /instances/types/price-history (b2ba972): daily cheapest GPU hourly prices
 * in cents. List prices and in-stock prices are reported separately; omitted
 * fields mean no listing or no stock that UTC day.
 */
describe('InstancePriceHistoryPointDTO (b2ba972)', () => {
  it('is exported from the main barrel for price-history chart clients', () => {
    const point: main.InstancePriceHistoryPointDTO = {
      day: '2026-10-01',
      providers: 2,
      regions: 1,
    };
    expect(point.providers).toBe(2);
  });

  it('accepts optional on-demand and spot prices in cents', () => {
    const full: InstancePriceHistoryPointDTO = {
      day: '2026-10-20',
      on_demand: 120,
      spot: 45,
      on_demand_in_stock: 130,
      spot_in_stock: 50,
      providers: 3,
      regions: 2,
    };
    expect(full).toEqual({
      day: '2026-10-20',
      on_demand: 120,
      spot: 45,
      on_demand_in_stock: 130,
      spot_in_stock: 50,
      providers: 3,
      regions: 2,
    });
  });

  it('allows omitting price fields when nothing was listed or in stock', () => {
    const sparse: InstancePriceHistoryPointDTO = {
      day: '2026-10-19',
      on_demand: 100,
      providers: 1,
      regions: 0,
    };
    expect(sparse.spot).toBeUndefined();
    expect(sparse.on_demand_in_stock).toBeUndefined();
    expect(sparse.spot_in_stock).toBeUndefined();
  });

  it('keeps InstancePriceHistoryPointDTO fields stable in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(
      /export interface InstancePriceHistoryPointDTO \{[\s\S]*?day: string;[\s\S]*?on_demand\?: number[\s\S]*?spot\?: number[\s\S]*?on_demand_in_stock\?: number[\s\S]*?spot_in_stock\?: number[\s\S]*?providers: number[\s\S]*?regions: number/
    );
    expect(source).toMatch(
      /InstancePriceHistoryPointDTO is one day's cheapest hourly prices, in cents/
    );
  });
});
