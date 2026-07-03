// Manifest lint: Discord rejects invalid registrations at PUT time with opaque errors — these
// checks fail in CI instead, with names. Also pins the install-everywhere posture (user-install
// is what makes Phase 0/1 work in any server/DM).
import { describe, expect, it } from 'vitest';
import { COMMAND_MANIFEST } from './manifest';

describe('COMMAND_MANIFEST', () => {
  it('names are lowercase, 1-32 chars; descriptions 1-100 chars', () => {
    for (const command of COMMAND_MANIFEST) {
      expect(command.name).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
      expect(command.description.length).toBeGreaterThan(0);
      expect(command.description.length).toBeLessThanOrEqual(100);
      for (const option of command.options ?? []) {
        expect(option.name).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
        expect(option.description.length).toBeLessThanOrEqual(100);
      }
    }
  });

  it('required options come before optional ones (Discord rejects the reverse)', () => {
    for (const command of COMMAND_MANIFEST) {
      const options = command.options ?? [];
      const flags = options.map(o => ('required' in o && o.required === true ? 1 : 0));
      const firstOptional = flags.indexOf(0);
      if (firstOptional !== -1) {
        expect(flags.slice(firstOptional)).not.toContain(1);
      }
    }
  });

  it('every command is registered for guild AND user install; /log is guild-context only', () => {
    for (const command of COMMAND_MANIFEST) {
      expect(command.integration_types).toEqual([0, 1]);
      // /log writes to the campaign linked to a SERVER surface — meaningless in DMs.
      expect(command.contexts).toEqual(command.name === 'log' ? [0] : [0, 1, 2]);
    }
  });

  it('command names are unique', () => {
    const names = COMMAND_MANIFEST.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
