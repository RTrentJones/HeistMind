// The default dice realizer: CSPRNG d6 faces. Handlers receive it via BotContext.realize so
// tests can substitute a scripted pool (the engine's "dice realized by the caller" contract).
import { randomInt } from 'node:crypto';

/** Roll `count` six-sided dice. */
export function realizeD6(count: number): number[] {
  return Array.from({ length: count }, () => randomInt(1, 7));
}

/** Roll `count` dice with `sides` faces (the /dice generic roller). */
export function realizeDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => randomInt(1, sides + 1));
}
