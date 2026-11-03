/**
 * Request bodies of the generic create/update routes.
 *
 * Each type names exactly the fields its route writes. Send only the fields
 * you change: the API checks every key of a write body against the route's
 * writable fields (go/api docs/writable-fields.md), and in enforce mode it
 * answers 400 `validation_error`, with `meta.fields` naming each field and
 * its reason, to a body carrying an unknown key, a relation (`user`, `team`,
 * `project`, ...) or a read-only field whose value differs from the stored
 * one. Do not send a fetched DTO back. A field with its own endpoint is
 * listed next to the type that cannot set it.
 *
 * Both a POST /{resource}/{id} update and a PATCH write the fields sent and
 * keep the others. The SDK's update methods for projects, knowledge, skills,
 * chats, engines and teams send PATCH; apps.patch and flows.patch are the
 * partial siblings of the POST updates that also edit a version.
 */
import type {
  AgentConfigInput,
  ResourceImages,
  AppDTO,
  ChatDTO,
  CredentialRequirements,
  EngineDTO,
  FlowDTO,
  FlowVersionDTO,
  KnowledgeDTO,
  MCPServerDTO,
  ProjectDTO,
  TeamDTO,
  Visibility,
} from '../types.js';

/**
 * POST /agents/{id}. Images, and a new version when `version` is set.
 * Visibility: `agents.updateVisibility`. Name, title, harness, placement:
 * set at creation. Project: `agents.moveToProject`; owner:
 * `agents.transferOwnership`.
 */
export interface AgentUpdateBody {
  images?: ResourceImages;
  version?: AgentConfigInput;
}

/**
 * PATCH /apps/{id}: only the fields sent are written. The app's copy;
 * the version is edited through POST (`apps.update`).
 */
export type AppPatchBody = Partial<
  Pick<AppDTO, 'title' | 'description' | 'agent_description' | 'category' | 'images' | 'tags'>
>;

/**
 * POST /apps/{id}. The app's copy, plus an in-place edit of the version
 * named by `version_id` (its metadata, required secrets and required
 * credentials). Status: `apps.updateStatus`; visibility:
 * `apps.updateVisibility`; name, namespace and version contents: a deploy.
 */
export type AppUpdateBody = AppPatchBody & Partial<Pick<AppDTO, 'version_id' | 'version'>>;

/**
 * PATCH /chats/{id}. Name and description. Visibility and the chat's
 * settings: `chats.updateSettings`.
 */
export type ChatUpdateBody = Partial<Pick<ChatDTO, 'name' | 'description'>>;

/** PATCH /engines/{id}. The engine's name; the rest is the engine's own report. */
export type EngineUpdateBody = Partial<Pick<EngineDTO, 'name'>>;

/** PATCH /flows/{id}: only the fields sent are written. */
export type FlowPatchBody = Partial<
  Pick<FlowDTO, 'name' | 'title' | 'description' | 'card_image' | 'thumbnail' | 'banner_image'>
>;

/**
 * POST /flows/{id}. The flow's copy and images (as PATCH), plus
 * `draft_version`, naming the flow's own draft by id, which saves that
 * draft's graph. Visibility: `flows.updateVisibility`; viewport:
 * `flows.saveViewport`.
 */
export type FlowUpdateBody = FlowPatchBody & {
  draft_version?: Partial<FlowVersionDTO> & { id: string };
};

/** Where the flow editor's canvas looks (POST /flows/{id}/viewport). */
export interface FlowViewportBody {
  x: number;
  y: number;
  zoom: number;
}

/**
 * PATCH /projects/{id}. Name, description, type, color and icon. Visibility
 * is set on create only; no route changes it afterwards. Parent: none.
 */
export type ProjectUpdateBody = Partial<
  Pick<ProjectDTO, 'name' | 'description' | 'type' | 'color' | 'icon'>
>;

/** POST /projects. The update fields, plus visibility. */
export type ProjectCreateBody = ProjectUpdateBody & {
  visibility?: Visibility;
};

/** @deprecated Use ProjectCreateBody or ProjectUpdateBody. */
export type ProjectWriteBody = ProjectCreateBody;

/**
 * PATCH /knowledge/{id} and PATCH /skills/{id}. Copy and lifecycle. Name and
 * type: fixed at creation; content: a new version (`create` with the same
 * name); visibility: `updateVisibility`.
 */
export interface KnowledgeUpdateBody {
  title?: string;
  description?: string;
  repo_url?: string;
  lifecycle?: KnowledgeDTO['lifecycle'];
}

/**
 * PATCH /teams/{id}. A team admin changes the profile; status and
 * concurrency are platform staff's. The username is the team's namespace
 * and does not change here.
 */
export type TeamUpdateBody = Partial<Pick<TeamDTO, 'name' | 'email' | 'avatar_url'>>;

/**
 * POST /mcp-servers. The server's address, copy, auth and credentials, and
 * its visibility. Owner and namespace come from the caller.
 */
export type MCPServerCreateBody = Partial<
  Pick<
    MCPServerDTO,
    | 'slug'
    | 'name'
    | 'title'
    | 'description'
    | 'icon_url'
    | 'server_url'
    | 'auth_type'
    | 'default_scopes'
    | 'headers'
    | 'documentation_url'
    | 'credentials'
    | 'visibility'
  >
>;

/**
 * PUT /mcp-servers/{id}. A field left out keeps its value. Title,
 * description, icon URL and documentation URL take what is sent, and ""
 * clears them; slug, name and server URL change only to a non-empty value.
 * Headers sent replace the set ({} clears it); default scopes sent replace
 * the list; `credentials` sent replace the declaration of the provider the
 * server signs in through ([] clears it). Auth type is the server's own
 * report. The provider's OAuth app: `PUT /credentials/{slug}/app`.
 * Visibility: `POST /mcp-servers/{id}/visibility`.
 */
export interface MCPServerUpdateBody {
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  icon_url?: string;
  server_url?: string;
  default_scopes?: string[];
  headers?: { [key: string]: string };
  documentation_url?: string;
  credentials?: CredentialRequirements;
}
