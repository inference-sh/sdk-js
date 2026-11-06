import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import type { PublicationCreateBody, PublicationUpdateBody } from './write-bodies.js';
import { PublicationDTO } from '../types.js';

/**
 * Publications API
 *
 * A publication makes a resource (an agent) embeddable on other sites:
 * which origins may embed it, its rate limit and its theme.
 */
export class PublicationsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List a resource's publications
   */
  async list(resourceType: string, resourceId: string): Promise<Response<PublicationDTO[]>> {
    return this.http.request<PublicationDTO[]>('get', '/publications', {
      params: { resource_type: resourceType, resource_id: resourceId },
    });
  }

  /**
   * Get a publication by ID
   */
  async get(id: string): Promise<Response<PublicationDTO>> {
    return this.http.request<PublicationDTO>('get', `/publications/${id}`);
  }

  /**
   * Publish a resource
   */
  async create(data: PublicationCreateBody): Promise<Response<PublicationDTO>> {
    return this.http.request<PublicationDTO>('post', '/publications', { data });
  }

  /**
   * Write a publication's whole row: a field left out is cleared
   */
  async update(id: string, data: PublicationUpdateBody): Promise<Response<PublicationDTO>> {
    return this.http.request<PublicationDTO>('put', `/publications/${id}`, { data });
  }

  /**
   * Write only the fields sent
   */
  async patch(id: string, data: PublicationUpdateBody): Promise<Response<PublicationDTO>> {
    return this.http.request<PublicationDTO>('patch', `/publications/${id}`, { data });
  }

  /**
   * Unpublish
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/publications/${id}`);
  }
}
