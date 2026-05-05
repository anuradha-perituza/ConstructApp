/**
 * Tests for materialExtractor — the two-tier extraction pipeline.
 * Covers the regex fallback path (no API key) and the Claude AI path (mocked fetch).
 */

// Constants mock must be set up before the module under test is imported.
const mockExtra = { anthropicApiKey: undefined };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: mockExtra } },
}));

import { extractMaterial } from '../services/materialExtractor';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeClaudeResponse(json) {
  return {
    ok: true,
    json: async () => ({
      content: [{ text: typeof json === 'string' ? json : JSON.stringify(json) }],
    }),
  };
}

// ─── regex fallback path (no valid API key) ──────────────────────────────────

describe('extractMaterial — regex fallback', () => {
  beforeEach(() => {
    mockExtra.anthropicApiKey = undefined; // no key → regex path
  });

  describe('pattern: <N> <unit> [of] <material>', () => {
    test('4 bags of type-S mortar', async () => {
      const r = await extractMaterial('4 bags of type-S mortar');
      expect(r.name).toBe('Type-S Mortar');
      expect(r.quantity).toBe('4 bags');
    });

    test('10 sheets of plywood', async () => {
      const r = await extractMaterial('10 sheets of plywood');
      expect(r.name).toBe('Plywood');
      expect(r.quantity).toBe('10 sheets');
    });

    test('2 rolls of wire mesh', async () => {
      const r = await extractMaterial('2 rolls of wire mesh');
      expect(r.name).toBe('Wire Mesh');
      expect(r.quantity).toBe('2 rolls');
    });

    test('1 pallet of concrete blocks', async () => {
      const r = await extractMaterial('1 pallet of concrete blocks');
      expect(r.name).toBe('Concrete Blocks');
      expect(r.quantity).toBe('1 pallets');
    });
  });

  describe('filler-word stripping', () => {
    test('"I need N unit material"', async () => {
      const r = await extractMaterial('I need 5 bags of sand');
      expect(r.name).toBe('Sand');
      expect(r.quantity).toBe('5 bags');
    });

    test('"we need N unit material"', async () => {
      const r = await extractMaterial('we need 3 boxes of nails');
      expect(r.name).toBe('Nails');
      expect(r.quantity).toBe('3 boxes');
    });

    test('"get me N unit material"', async () => {
      const r = await extractMaterial('get me 6 tubes of caulk');
      expect(r.name).toBe('Caulk');
      expect(r.quantity).toBe('6 tubes');
    });

    test('strips trailing "for the project"', async () => {
      const r = await extractMaterial('4 bags of cement for the project');
      expect(r.name).toBe('Cement');
      expect(r.quantity).toBe('4 bags');
    });

    test('strips trailing "for the site"', async () => {
      const r = await extractMaterial('8 sheets of drywall for the site');
      expect(r.name).toBe('Drywall');
      expect(r.quantity).toBe('8 sheets');
    });
  });

  describe('unit normalisation', () => {
    test('"sacks" → "bags"', async () => {
      const r = await extractMaterial('3 sacks of sand');
      expect(r.quantity).toBe('3 bags');
    });

    test('"pieces" → "pcs"', async () => {
      const r = await extractMaterial('5 pieces of lumber');
      expect(r.quantity).toBe('5 pcs');
    });

    test('"gallons" → "gal"', async () => {
      const r = await extractMaterial('2 gallons of primer');
      expect(r.quantity).toBe('2 gal');
    });

    test('"packet" → "packs"', async () => {
      const r = await extractMaterial('4 packets of screws');
      expect(r.quantity).toBe('4 packs');
    });
  });

  describe('pattern: <material> <N> <unit>  (reversed)', () => {
    test('rebar 20 sticks', async () => {
      const r = await extractMaterial('rebar 20 sticks');
      expect(r.name).toBe('Rebar');
      expect(r.quantity).toBe('20 sticks');
    });

    test('TYPE-S MORTAR 4 bags', async () => {
      const r = await extractMaterial('TYPE-S MORTAR 4 bags');
      expect(r.name).toBe('Type-S Mortar');
      expect(r.quantity).toBe('4 bags');
    });
  });

  describe('pattern: <N> <material>  (bare, no unit)', () => {
    test('4 cement → 4 units', async () => {
      const r = await extractMaterial('4 cement');
      expect(r.quantity).toBe('4 units');
      expect(r.name).toBe('Cement');
    });
  });

  describe('no-match fallback', () => {
    test('plain material name → name only, empty quantity/spec', async () => {
      const r = await extractMaterial('some material');
      expect(r.name).toBe('Some Material');
      expect(r.quantity).toBe('');
      expect(r.spec).toBe('');
    });
  });

  describe('spec extraction', () => {
    test('extracts weight spec (lb)', async () => {
      const r = await extractMaterial('5 bags hydraulic cement 94 lb each');
      expect(r.spec).toContain('94 lb');
    });

    test('extracts dimension spec (fraction)', async () => {
      const r = await extractMaterial("12 sheets 3/4 plywood");
      expect(r.spec).toContain('3/4');
    });

    test('extracts grade spec (#4)', async () => {
      const r = await extractMaterial('20 sticks rebar #4');
      expect(r.spec).toContain('#4');
    });

    test('extracts length spec (ft)', async () => {
      const r = await extractMaterial('10 lengths pipe 20 ft each');
      expect(r.spec).toContain('20 ft');
    });

    test('extracts type spec', async () => {
      const r = await extractMaterial('6 bags type-s mortar');
      expect(r.spec).toContain('type-s');
    });
  });
});

// ─── Claude AI path (mocked fetch) ───────────────────────────────────────────

describe('extractMaterial — Claude AI path', () => {
  const VALID_KEY = 'sk-ant-api03-test-key-long-enough-for-check-xxxxxxxxxx';

  beforeEach(() => {
    mockExtra.anthropicApiKey = VALID_KEY;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    mockExtra.anthropicApiKey = undefined;
  });

  test('returns Claude result on successful API call', async () => {
    global.fetch.mockResolvedValueOnce(
      makeClaudeResponse({ name: 'Type-S Mortar', quantity: '4 bags', spec: '' })
    );
    const r = await extractMaterial('4 bags of type-s mortar');
    expect(r).toEqual({ name: 'Type-S Mortar', quantity: '4 bags', spec: '' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': VALID_KEY }),
      })
    );
  });

  test('falls back to regex when HTTP response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    const r = await extractMaterial('4 bags of mortar');
    expect(r.quantity).toBe('4 bags'); // regex result
  });

  test('falls back to regex when Claude returns invalid JSON', async () => {
    global.fetch.mockResolvedValueOnce(
      makeClaudeResponse('this is not json at all')
    );
    const r = await extractMaterial('4 bags of mortar');
    expect(r.quantity).toBe('4 bags');
  });

  test('falls back to regex when Claude returns JSON without "name"', async () => {
    global.fetch.mockResolvedValueOnce(
      makeClaudeResponse({ qty: '4 bags' }) // missing "name" key
    );
    const r = await extractMaterial('4 bags of mortar');
    expect(r.quantity).toBe('4 bags');
  });

  test('falls back to regex on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));
    const r = await extractMaterial('4 bags of mortar');
    expect(r.quantity).toBe('4 bags');
  });

  test('skips Claude and uses regex for placeholder key (YOUR_...)', async () => {
    mockExtra.anthropicApiKey = 'YOUR_ANTHROPIC_API_KEY_HERE';
    await extractMaterial('4 bags of mortar');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('skips Claude and uses regex when key is too short', async () => {
    mockExtra.anthropicApiKey = 'sk-ant-short';
    await extractMaterial('4 bags of mortar');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('sends correct model and message payload', async () => {
    global.fetch.mockResolvedValueOnce(
      makeClaudeResponse({ name: 'Sand', quantity: '3 bags', spec: '' })
    );
    await extractMaterial('3 bags of sand');
    const [, init] = global.fetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toContain('3 bags of sand');
  });
});
