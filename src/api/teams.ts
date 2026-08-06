import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  UserDTO,
  TeamRelationDTO,
  TeamMemberDTO,
  TeamInviteDTO,
  TeamCreateRequest,
  TeamMemberAddRequest,
  TeamInviteCreateRequest,
  CursorListRequest,
  CursorListResponse,
  AvailabilityResponse,
} from '../types';

export interface MeResponse {
  user: UserDTO;
  team?: TeamRelationDTO;
}

/**
 * Teams API
 */
export class TeamsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * Get current user and team context
   */
  async me(): Promise<Response<MeResponse>> {
    return this.http.request<MeResponse>('get', '/me');
  }

  /**
   * List user's teams
   */
  async list(): Promise<Response<TeamRelationDTO[]>> {
    return this.http.request<TeamRelationDTO[]>('get', '/teams');
  }

  /**
   * Get a team by ID
   */
  async get(teamId: string): Promise<Response<TeamRelationDTO>> {
    return this.http.request<TeamRelationDTO>('get', `/teams/${teamId}`);
  }

  /**
   * Create a new team
   */
  async create(data: TeamCreateRequest): Promise<Response<TeamRelationDTO>> {
    return this.http.request<TeamRelationDTO>('post', '/teams', { data });
  }

  /**
   * Update a team
   */
  async update(teamId: string, data: Partial<TeamCreateRequest>): Promise<Response<TeamRelationDTO>> {
    return this.http.request<TeamRelationDTO>('post', `/teams/${teamId}`, { data });
  }

  /**
   * Delete a team
   */
  async delete(teamId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/teams/${teamId}`);
  }

  /**
   * Check username availability
   */
  async checkUsername(username: string): Promise<Response<AvailabilityResponse>> {
    return this.http.request<AvailabilityResponse>('get', '/teams/check-username', { params: { username } });
  }

  /**
   * Get team members
   */
  async getMembers(teamId: string): Promise<Response<TeamMemberDTO[]>> {
    return this.http.request<TeamMemberDTO[]>('get', `/teams/${teamId}/members`);
  }

  /**
   * Add a team member
   */
  async addMember(teamId: string, data: TeamMemberAddRequest): Promise<Response<TeamMemberDTO>> {
    return this.http.request<TeamMemberDTO>('post', `/teams/${teamId}/members`, { data });
  }

  /**
   * Remove a team member
   */
  async removeMember(teamId: string, userId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/teams/${teamId}/members/${userId}`);
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(teamId: string, userId: string, role: string): Promise<Response<TeamMemberDTO>> {
    return this.http.request<TeamMemberDTO>('post', `/teams/${teamId}/members/${userId}/role`, { data: { role } });
  }

  /**
   * List team invites
   */
  async listInvites(teamId: string): Promise<Response<TeamInviteDTO[]>> {
    return this.http.request<TeamInviteDTO[]>('get', `/teams/${teamId}/invites`);
  }

  /**
   * Create an invite
   */
  async createInvite(teamId: string, data: TeamInviteCreateRequest): Promise<Response<TeamInviteDTO>> {
    return this.http.request<TeamInviteDTO>('post', `/teams/${teamId}/invites`, { data });
  }

  /**
   * Revoke an invite
   */
  async revokeInvite(teamId: string, inviteId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/teams/${teamId}/invites/${inviteId}`);
  }
}
