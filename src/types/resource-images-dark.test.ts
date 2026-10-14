import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AppCategoryVideo,
  AppStatusActive,
  type AgentDTO,
  type AppDTO,
  type ArtifactDTO,
  type CreateAgentRequest,
  type CreateAppRequest,
  type ResourceImages,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

const lightSlots: ResourceImages = {
  card: 'https://cdn.test/card-light.png',
  thumbnail: 'https://cdn.test/thumb-light.png',
  banner: 'https://cdn.test/banner-light.png',
};

const darkSlots: ResourceImages = {
  card: 'https://cdn.test/card-dark.png',
  thumbnail: 'https://cdn.test/thumb-dark.png',
  banner: 'https://cdn.test/banner-dark.png',
};

/**
 * types regen afaed75: AppImages and AgentImages fold into ResourceImages;
 * theme-specific covers move from ArtifactDTO.images_dark to ResourceImages.dark.
 */
describe('ResourceImages.dark (afaed75)', () => {
  it('accepts light-only image sets when dark theme reuses the same slots', () => {
    const images: ResourceImages = lightSlots;

    expect(images.dark).toBeUndefined();
    expect(images.card).toBe(lightSlots.card);
  });

  it('accepts nested dark slots for theme-specific covers', () => {
    const images: ResourceImages = {
      ...lightSlots,
      dark: darkSlots,
    };

    expect(images.dark).toEqual(darkSlots);
    expect(images.dark?.card).not.toBe(images.card);
  });
});

describe('unified ResourceImages on listable resources (afaed75)', () => {
  it('types create payloads with optional themed images', () => {
    const agentReq: CreateAgentRequest = {
      name: 'support-bot',
      images: { ...lightSlots, dark: darkSlots },
    };
    const appReq: CreateAppRequest = {
      name: 'veo',
      images: lightSlots,
    };

    expect(agentReq.images?.dark?.banner).toBe(darkSlots.banner);
    expect(appReq.images).toEqual(lightSlots);
  });

  it('types artifact, app, and agent responses with the same image shape', () => {
    const themed: ResourceImages = { ...lightSlots, dark: darkSlots };

    const artifact: ArtifactDTO = {
      id: 'art-themed',
      namespace: 'acme',
      name: 'dashboard',
      title: 'Dashboard',
      type: 'html',
      images: themed,
      version_id: 'ver-1',
      views: 3,
    };

    const agent: AgentDTO = {
      id: 'agent-themed',
      namespace: 'acme',
      name: 'support',
      title: 'Support',
      images: themed,
      version_id: 'ver-1',
      harness: 'inference',
    };

    const app: AppDTO = {
      id: 'app-themed',
      namespace: 'acme',
      name: 'veo',
      title: 'Veo',
      description: 'Video model',
      agent_description: 'Generate video',
      category: AppCategoryVideo,
      images: themed,
      tags: ['video'],
      version_id: 'ver-1',
      status: AppStatusActive,
    };

    expect(artifact.images.dark?.card).toBe(darkSlots.card);
    expect(agent.images).toEqual(themed);
    expect(app.images.dark).toEqual(darkSlots);
  });
});

describe('types.ts regen guards for ResourceImages unification (afaed75)', () => {
  it('removes AppImages and AgentImages in favor of ResourceImages', () => {
    expect(typesSource).not.toMatch(/export interface AgentImages\b/);
    expect(typesSource).not.toMatch(/export interface AppImages\b/);
    expect(typesSource).toMatch(/export interface ResourceImages\b/);
  });

  it('declares dark nested on ResourceImages and drops ArtifactDTO.images_dark', () => {
    const resourceBlock = typesSource.match(/export interface ResourceImages \{[\s\S]*?\n\}/);
    expect(resourceBlock).not.toBeNull();
    expect(resourceBlock![0]).toMatch(/dark\?:\s*ResourceImages;/);
    expect(resourceBlock![0]).toMatch(/Dark holds the same slots for a dark theme/);

    const artifactBlock = typesSource.match(/export interface ArtifactDTO extends[\s\S]*?\n\}/);
    expect(artifactBlock).not.toBeNull();
    expect(artifactBlock![0]).toMatch(/images:\s*ResourceImages;/);
    expect(artifactBlock![0]).not.toMatch(/images_dark/);
  });

  it('uses ResourceImages on agent and app DTOs and create requests', () => {
    expect(typesSource).toMatch(/export interface AgentDTO[\s\S]*?images:\s*ResourceImages;/);
    expect(typesSource).toMatch(/export interface CreateAgentRequest[\s\S]*?images\?:\s*ResourceImages;/);
    expect(typesSource).toMatch(/export interface AppDTO[\s\S]*?images:\s*ResourceImages;/);
    expect(typesSource).toMatch(/export interface CreateAppRequest[\s\S]*?images\?:\s*ResourceImages;/);
  });
});
