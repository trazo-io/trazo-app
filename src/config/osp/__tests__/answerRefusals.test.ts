/**
 * A refused statement reads as the question and the server's reason, never as a lost connection
 * (browser pass, 2026-11-09: G4.0's "all fertility materials are listed" refused at the write showed
 * "The save did not reach the server").
 */
import { describe, expect, it } from 'vitest';

import { refusedAnswerLines } from '../answerRefusals';
import type { ModuleDefinition } from '../types';

const definition = {
  key: 'g4_0_rotation_soil',
  pages: [
    {
      key: 'b',
      questions: [
        {
          key: 'fertility_inputs_listed',
          label: {
            en: 'Are all fertility materials you apply listed?',
            es: '¿Están todos listados?'
          }
        }
      ]
    }
  ]
} as unknown as ModuleDefinition;

describe('refusedAnswerLines', () => {
  it('names the refused question by its label with the server reason', () => {
    const payload = {
      answers: {
        fertility_inputs_listed: 'The records name 1 product(s) this list does not hold: X.'
      }
    };
    expect(refusedAnswerLines(payload, definition, 'en-US')).toEqual([
      'Are all fertility materials you apply listed?: The records name 1 product(s) this list does not hold: X.'
    ]);
    expect(refusedAnswerLines(payload, definition, 'es-419')[0]).toMatch(
      /^¿Están todos listados\?: /
    );
  });

  it('reads the completion refusal too', () => {
    const payload = {
      complete: 'An attestation refers to a list that is still empty.',
      attestations: { fertility_inputs_listed: ['Add each one to the list.'] }
    };
    expect(refusedAnswerLines(payload, definition, 'en-US')).toEqual([
      'Are all fertility materials you apply listed?: Add each one to the list.'
    ]);
  });

  it('says nothing for a payload with no per-question refusal', () => {
    expect(refusedAnswerLines({ detail: 'locked' }, definition, 'en-US')).toEqual([]);
    expect(refusedAnswerLines(undefined, definition, 'en-US')).toEqual([]);
  });
});
