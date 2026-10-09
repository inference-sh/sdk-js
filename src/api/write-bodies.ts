/**
 * Request bodies of the generic create/update routes.
 *
 * Each type names exactly the fields its route writes; the API leaves every
 * other field of the body alone (a full DTO sent back is fine, its other
 * fields are ignored). A field with its own endpoint is listed next to the
 * type that cannot set it.
 *
 * A POST /{resource}/{id} update writes every field below that the route
 * takes: a field left out of the body is written empty. A PATCH writes only
 * the fields sent. The SDK's update methods for projects, knowledge, skills,
 * chats, engines and teams send PATCH; apps.patch and flows.patch are the
 * partial siblings of the POST updates that also edit a version.
 */
import type {
  AgentConfigInput,
  AgentImages,
  AppDTO,
  ChatDTO,
  EngineDTO,
  FlowDTO,
  FlowVersionDTO,
  KnowledgeDTO,
  MCPServerAuthType,
  ProjectDTO,
  TeamDTO,
  Visibility,
} from '../types';

/**
 * POST /agents/{id}. Visibility and images, and a new version when
 * `version` is set. Name, title, harness, placement: set at creation.
 * Project: `agents.moveToProject`; owner: `agents.transferOwnership`.
 */
export interface AgentUpdateBody {
  visibility?: Visibility;
  images?: AgentImages;
  version?: AgentConfigInput;
}

/**
 * POST /apps/{id}. The app's copy, plus an in-place edit of the version
 * named by `version_id` (its metadata, required secrets and required
 * credentials). Status: `apps.updateStatus`; visibility:
 * `apps.updateVisibility`; name, namespace and version contents: a deploy.
 */
export type AppUpdateBody = Partial<
  Pick<
    AppDTO,
    | 'title'
    | 'description'
    | 'agent_description'
    | 'category'
    | 'images'
    | 'tags'
    | 'version_id'
    | 'version'
  >
>;

/**
 * PATCH /apps/{id}: only the fields sent are written. The app's copy;
 * the version is edited through POST (`apps.update`).
 */
export type AppPatchBody = Partial<
  Pick<AppDTO, 'title' | 'description' | 'agent_description' | 'category' | 'images' | 'tags'>
>;

/**
 * PATCH /chats/{id}. Name and description. Visibility and the chat's
 * settings: `chats.updateSettings`.
 */
export type ChatUpdateBody = Partial<Pick<ChatDTO, 'name' | 'description'>>;

/** PATCH /engines/{id}. The engine's name; the rest is the engine's own report. */
export type EngineUpdateBody = Partial<Pick<EngineDTO, 'name'>>;

/**
 * POST /flows/{id} and PATCH /flows/{id}. The flow's copy and images.
 * `draft_version`, naming the flow's own draft by id, saves that draft's
 * graph (POST only). Visibility: `flows.updateVisibility`; viewport:
 * `flows.saveViewport`.
 */
export type FlowUpdateBody = Partial<
  Pick<FlowDTO, 'name' | 'title' | 'description' | 'card_image' | 'thumbnail' | 'banner_image'>
> & {
  draft_version?: Partial<FlowVersionDTO> & { id: string };
};

/** PATCH /flows/{id}: only the fields sent are written. */
export type FlowPatchBody = Partial<
  Pick<FlowDTO, 'name' | 'title' | 'description' | 'card_image' | 'thumbnail' | 'banner_image'>
>;

/** Where the flow editor's canvas looks (POST /flows/{id}/viewport). */
export interface FlowViewportBody {
  x: number;
  y: number;
  zoom: number;
}

/**
 * POST /projects and PATCH /projects/{id}. Visibility is taken on create
 * only; no route changes it afterwards. Parent: none.
 */
export type ProjectWriteBody = Partial<
  Pick<ProjectDTO, 'name' | 'description' | 'type' | 'color' | 'icon'>
> & {
  visibility?: Visibility;
};

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
 * PUT /mcp-servers/{id}. A field left out keeps its value. Title,
 * description, icon URL and documentation URL take what is sent, and ""
 * clears them; slug, name, server URL, auth type and the OAuth client
 * change only to a non-empty value. Headers sent replace the set ({}
 * clears it). Visibility: `POST /mcp-servers/{id}/visibility`.
 */
export interface MCPServerUpdateBody {
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  icon_url?: string;
  server_url?: string;
  auth_type?: MCPServerAuthType;
  oauth_client_id?: string;
  oauth_secret_key?: string;
  default_scopes?: string[];
  headers?: { [key: string]: string };
  documentation_url?: string;
}
