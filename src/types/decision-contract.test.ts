import * as main from '../index';
import {
  ErrorCodeImpersonationReasonRequired,
  type DecisionChoiceAnswer,
  type DecisionInput,
  type DecisionNoulAnswer,
  type DecisionOutput,
  type DecisionScoreAnswer,
  type DecisionVisionInput,
} from '../types';

/**
 * types regen 1b2e21a: Decision* input/output contract and
 * ErrorCodeImpersonationReasonRequired for admin team impersonation.
 */
describe('ErrorCode impersonation_reason_required (1b2e21a)', () => {
  it('exports the constant on types and the main barrel', () => {
    expect(ErrorCodeImpersonationReasonRequired).toBe('impersonation_reason_required');
    expect(main.ErrorCodeImpersonationReasonRequired).toBe('impersonation_reason_required');
  });
});

describe('Decision input contract (1b2e21a)', () => {
  const choiceInput: DecisionInput = {
    state: { ticket: 'refund request', amount: 42 },
    choices: [
      {
        id: 'intent',
        instructions: 'Which intent best matches the ticket?',
        options: [
          { name: 'billing', description: 'Payment or invoice issues' },
          { name: 'shipping', description: 'Delivery status' },
        ],
      },
    ],
    scores: [
      {
        id: 'urgency',
        instructions: 'How urgent is this?',
        levels: ['low', 'medium', 'high'],
      },
    ],
    nouls: [
      {
        id: 'fraud_risk',
        instructions: 'Is this likely fraud?',
        criteria: { true: 'suspicious patterns', false: 'ordinary support case' },
      },
    ],
  };

  it('accepts choice, score, and noul questions keyed by id', () => {
    expect(choiceInput.choices?.[0].id).toBe('intent');
    expect(choiceInput.choices?.[0].options.map((o) => o.name)).toEqual(['billing', 'shipping']);
    expect(choiceInput.scores?.[0].levels).toHaveLength(3);
    expect(choiceInput.nouls?.[0].criteria?.true).toBe('suspicious patterns');
  });

  it('extends DecisionInput with image URIs for vision models', () => {
    const vision: DecisionVisionInput = {
      ...choiceInput,
      images: ['file://uploads/receipt.png'],
    };
    expect(vision.images).toEqual(['file://uploads/receipt.png']);
    expect(vision.state).toEqual(choiceInput.state);
  });
});

describe('Decision output contract (1b2e21a)', () => {
  const choiceAnswer: DecisionChoiceAnswer = {
    choice: 'billing',
    confidence: 0.91,
    probabilities: { billing: 0.91, shipping: 0.09 },
  };

  const scoreAnswer: DecisionScoreAnswer = {
    score: 1.4,
    normalized: 0.7,
    confidence: 0.88,
    probabilities: { '0': 0.1, '1': 0.3, '2': 0.6 },
    legend: { '0': 'low', '1': 'medium', '2': 'high' },
  };

  const noulAnswer: DecisionNoulAnswer = { noul: 0.12 };

  const output: DecisionOutput = {
    choices: { intent: choiceAnswer },
    scores: { urgency: scoreAnswer },
    nouls: { fraud_risk: noulAnswer },
    model: 'acme/intent-router@latest',
    input_tokens: 0,
  };

  it('keys each answer map by question id and records token usage', () => {
    expect(output.choices.intent.choice).toBe('billing');
    expect(output.scores.urgency.probabilities['2']).toBe(0.6);
    expect(output.nouls.fraud_risk.noul).toBe(0.12);
    expect(output.input_tokens).toBe(0);
  });

  it('round-trips through JSON like an /apps/run task output payload', () => {
    const parsed = JSON.parse(JSON.stringify(output)) as DecisionOutput;
    expect(parsed.choices.intent.probabilities).toEqual(choiceAnswer.probabilities);
    expect(parsed.scores.urgency.legend).toEqual(scoreAnswer.legend);
    expect(parsed.model).toBe(output.model);
  });
});
