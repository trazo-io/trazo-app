/**
 * A block named in a voice note is OFFERED, never invented: it must be something the farmer
 * said, and a record's lot must never come from a pattern guessing between two candidates.
 * The sentences below are the ones spoken in production on 2026-09-11 plus the traps around them.
 */
import { describe, expect, it } from 'vitest';
import { blockIdentityKey, spokenBlock, voiceBlockSuggestion } from '../spokenBlock';

describe('spokenBlock — the block the farmer named', () => {
  it.each([
    // The production sentence: transcribed exactly, block left empty.
    ['Aplicamos azufre mojable en el bloque 4 10 libras por acre con la nebulizadora.', 'Bloque 4'],
    ['Sprayed Kocide 3000 on the walnuts in block 7, 2 pounds per acre.', 'Block 7'],
    ['Irrigated block number 12 for five hours.', 'Block 12'],
    ['Regamos el bloque número 3 por goteo.', 'Bloque 3'],
    ['Mowed block C this morning.', 'Block C'],
    // Deepgram's Spanish model writes the letter in lower case (MEASURED 2026-09-11).
    ['Aplicamos cobre en el bloque c, 2 libras por acre.', 'Bloque C'],
    // A word-letter counts when it is a capital.
    ['Regamos el bloque A por goteo.', 'Bloque A'],
    ['Thinned block 12B.', 'Block 12B'],
    ['Sprayed Entrust on the north block.', 'North Block'],
    ['Irrigated the south-west block with drip.', 'Southwest Block'],
    ['Regamos el bloque norte por goteo durante seis horas.', 'Bloque norte'],
    ['Aplicamos cobre en el bloque del sur.', 'Bloque sur'],
    ['Podamos el bloque este, fila 3.', 'Bloque este']
  ])('%s → %s', (transcript, label) => {
    expect(spokenBlock(transcript)?.label).toBe(label);
  });

  it.each([
    // "esta mañana" follows "bloque" — a time, not a block (the sentence that lost "norte").
    'Aplicamos azufre en el bloque esta mañana, 5 libras por acre.',
    // "este" is east after "bloque" — unless a day follows it.
    'Regamos el bloque este martes por la mañana.',
    // A lower-case letter that is also a WORD is the word: "a las ocho", "y el riego", "a day".
    'Aplicamos en el bloque a las ocho.',
    'Regamos el bloque y el riego quedó bien.',
    'Sprayed each block a day apart.',
    // Blocks named without an identifier say nothing about WHICH block.
    'Sprayed the whole block.',
    'Two gallons per block.',
    'No block mentioned at all.',
    '',
    // Two different blocks: which one this record is about is the farmer's call.
    'Irrigated block 3 and block 4.',
    'Regamos el bloque norte y el bloque sur.'
  ])('names no single block: %s', (transcript) => {
    expect(spokenBlock(transcript)).toBeNull();
  });

  it('one block said twice is still one block', () => {
    expect(spokenBlock('Block 4, I mean block 4 again.')?.label).toBe('Block 4');
  });
});

describe('blockIdentityKey — the same block, however the grower wrote it', () => {
  it.each([
    ['Block 4', '4'],
    ['Bloque 4', '4'],
    ['block-4', '4'],
    ['North Block', 'north'],
    ['Bloque Norte', 'north'],
    ['Block C - East Section', 'c'],
    ['BGA', 'bga'],
    ['', '']
  ])('%s → %s', (blockId, key) => {
    expect(blockIdentityKey(blockId)).toBe(key);
  });
});

describe('voiceBlockSuggestion — what the wizard offers', () => {
  it('offers a NEW block when the parcel has never recorded it', () => {
    expect(
      voiceBlockSuggestion('Aplicamos azufre en el bloque 4, 10 libras por acre.', ['Block 1'])
    ).toEqual({ kind: 'new', value: 'Bloque 4' });
    // …and on a parcel with no blocks at all.
    expect(voiceBlockSuggestion('Mowed block C.', [])).toEqual({ kind: 'new', value: 'Block C' });
  });

  it("offers the grower's OWN block when it is the same one in other words", () => {
    // Spanish crew, English block names: "bloque 4" is not the words "Block 4", so the spoken-
    // name check could never reach it. Same identity → the grower's spelling, not a second one.
    expect(voiceBlockSuggestion('Regamos el bloque 4.', ['Block 4', 'Block 12'])).toEqual({
      kind: 'known',
      value: 'Block 4',
      spoken: 'Bloque 4'
    });
    // The local demo parcel's block, reached from Spanish with a lower-case letter.
    expect(
      voiceBlockSuggestion('Aplicamos cobre en el bloque c, 2 libras por acre.', [
        'Block C - East Section'
      ])
    ).toEqual({ kind: 'known', value: 'Block C - East Section', spoken: 'Bloque C' });
    expect(voiceBlockSuggestion('Regamos el bloque norte.', ['North Block'])).toEqual({
      kind: 'known',
      value: 'North Block',
      spoken: 'Bloque norte'
    });
  });

  it('never picks between two blocks with the same identity', () => {
    expect(voiceBlockSuggestion('Irrigated block 4.', ['Block 4 East', 'Block 4 West'])).toBeNull();
  });

  it('never matches a different block that merely CONTAINS the number', () => {
    // "Block 14" is not block 4 — identity, not substring.
    expect(voiceBlockSuggestion('Irrigated block 4.', ['Block 14'])).toEqual({
      kind: 'new',
      value: 'Block 4'
    });
  });

  it('offers nothing when no single block was named', () => {
    expect(voiceBlockSuggestion('Sprayed the whole orchard.', ['Block 4'])).toBeNull();
  });
});
