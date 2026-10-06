import * as main from '../index';
import {
  ErrorCodeAlreadyClaimed,
  ErrorCodeAlreadySubmitted,
  FormStatusOpen,
  FormSubmitOncePerUser,
  type BountyProgramDTO,
  type FormDTO,
  type FormSubmissionDTO,
  type SubmitBountyRequest,
  type SubmitBountyResponse,
  type SubmitFormResponse,
  type SubmitSurveyResponse,
  type UpdateFormRequest,
} from '../types';

/**
 * types regen bb223c3: forms no longer carry bounty/reward fields; bounties add
 * proof_form and ErrorCodeAlreadyClaimed; rewards move to POST /me/bounty and surveys.
 */
describe('BountyProgramDTO proof_form and claim errors (bb223c3)', () => {
  it('exports ErrorCodeAlreadyClaimed for duplicate bounty claims', () => {
    expect(ErrorCodeAlreadyClaimed).toBe('already_claimed');
    expect(main.ErrorCodeAlreadyClaimed).toBe('already_claimed');
  });

  it('requires proof_form on BountyProgramDTO and binds form programs to a form slug', () => {
    const formProgram: BountyProgramDTO = {
      id: 'bounty-form',
      namespace: 'platform',
      name: 'beta-proof',
      description: 'Submit the intake form',
      amount_microcents: 1_000_000,
      grant_type: 'credit',
      expiry_days: 14,
      max_per_user: 1,
      max_per_day: 5,
      proof_type: 'form',
      proof_form: 'acme/intake',
      requires_payment_method: false,
      status: 'active',
      notice_text: '',
      notice_cooldown_hours: 0,
      notice_priority: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const urlProgram: BountyProgramDTO = {
      ...formProgram,
      id: 'bounty-url',
      name: 'share-link',
      proof_type: 'url',
      proof_form: '',
    };
    expect(formProgram.proof_form).toBe('acme/intake');
    expect(urlProgram.proof_form).toBe('');
  });

  it('accepts form submission ids as proof_id when proof_type is form', () => {
    const body: SubmitBountyRequest = {
      bounty_id: 'bounty-form',
      proof_id: 'form-submission-42',
      source: 'api',
    };
    const response: SubmitBountyResponse = {
      submission: {
        id: 'claim-1',
        namespace: 'platform',
        bounty_id: body.bounty_id,
        proof_id: body.proof_id,
        proof_ref: 'form-submission-42',
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
      granted_amount: 1_000_000,
    };
    expect(response.submission.proof_id).toBe('form-submission-42');
  });
});

describe('forms decoupled from bounty rewards (bb223c3)', () => {
  it('accepts FormDTO payloads without bounty_name', () => {
    const form: FormDTO = {
      id: 'form-1',
      namespace: 'acme',
      name: 'intake',
      title: 'Intake',
      description: 'Collect feedback',
      schema: { type: 'object' },
      status: FormStatusOpen,
      submit_policy: FormSubmitOncePerUser,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(Object.prototype.hasOwnProperty.call(form, 'bounty_name')).toBe(false);
  });

  it('accepts UpdateFormRequest without bounty_name admin field', () => {
    const patch: UpdateFormRequest = {
      title: 'Renamed intake',
      submit_policy: FormSubmitOncePerUser,
    };
    expect(Object.prototype.hasOwnProperty.call(patch, 'bounty_name')).toBe(false);
  });

  it('records answers on FormSubmissionDTO without reward_amount fields', () => {
    const submission: FormSubmissionDTO = {
      id: 'sub-1',
      form_id: 'form-1',
      form_team_id: 'team-owner',
      submitter_team_id: 'team-user',
      data: { score: 5 },
      source: 'api',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    expect(Object.prototype.hasOwnProperty.call(submission, 'reward_amount')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(submission, 'reward_blocked_reason')).toBe(false);
  });

  it('returns SubmitFormResponse with submission only (rewards via bounties)', () => {
    const response: SubmitFormResponse = {
      submission: {
        id: 'sub-2',
        form_id: 'form-1',
        form_team_id: 'team-owner',
        data: { ok: true },
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
    };
    expect(response.submission.id).toBe('sub-2');
    expect(Object.prototype.hasOwnProperty.call(response, 'granted_amount')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(response, 'reward_blocked_reason')).toBe(false);
  });

  it('keeps form duplicate-submit ErrorCode separate from bounty already_claimed', () => {
    expect(ErrorCodeAlreadySubmitted).toBe('already_submitted');
    expect(ErrorCodeAlreadyClaimed).toBe('already_claimed');
    expect(ErrorCodeAlreadySubmitted).not.toBe(ErrorCodeAlreadyClaimed);
  });

  it('still exposes survey reward fields for CLI compatibility while forms do not', () => {
    const survey: SubmitSurveyResponse = {
      response: {
        id: 'ans-1',
        question_id: 'q-1',
        response: 'yes',
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
      granted_amount: 0,
      reward_blocked_reason: '',
    };
    expect(survey.granted_amount).toBe(0);
    expect(survey.reward_blocked_reason).toBe('');
  });
});
