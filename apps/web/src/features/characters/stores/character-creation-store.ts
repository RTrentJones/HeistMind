import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  validateCharacter,
  abilityChoiceLimit,
  isAbilityUnlocked,
  pointBuySpent,
  usesActionRatings,
  actionDotsSpent,
  deriveAttributes,
  type Ruleset,
  type RulesetContent,
  type CharacterData,
  type CreateCharacterData,
} from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useNotificationStore } from '@/shared/stores/notification-store';
import type { LoadingState } from '@/shared/types';
import {
  deriveSteps,
  emptyDraft,
  stepKind,
  type StepKind,
  type WizardStepMeta,
} from '../lib/creation-steps';

/** The highest affordable rating for one attribute, given what the others already cost. */
function maxAffordableRating(
  content: RulesetContent,
  attributes: Record<string, number>,
  attributeId: string,
  cap: number
): number {
  const pointBuy = content.characterCreation?.pointBuy;
  if (!pointBuy) return cap;
  const others = pointBuySpent(content, { ...attributes, [attributeId]: 0 });
  const remaining = pointBuy.totalPoints - others;
  const costAt = (r: number) => (r > 0 ? (pointBuy.attributeCosts?.[r] ?? r) : 0);
  for (let r = cap; r >= 0; r--) if (costAt(r) <= remaining) return r;
  return 0;
}

/** Whether a validation error's field belongs to a given creation step (to gate Next per-step). */
function errorBelongsToStep(field: string, kind: StepKind, stepId: string): boolean {
  if (field === `steps.${stepId}`) return true;
  if (kind === 'attributes')
    return field === 'attributes' || field.startsWith('attributes.') || field.startsWith('skills');
  if (kind === 'abilities')
    return field === 'specialAbilities' || field.startsWith('specialAbilities.');
  if (kind === 'choice') return field.startsWith('custom');
  return false;
}

interface CharacterCreationState extends LoadingState {
  // Transient (NOT persisted) — re-supplied on mount via initFromRuleset.
  ruleset: Ruleset | null;
  steps: WizardStepMeta[];

  // Persisted draft (so an interrupted creation resumes).
  gameId: string | null;
  rulesetId: string | null;
  name: string;
  draft: CharacterData;
  stepIndex: number;

  // Lifecycle
  initFromRuleset: (ruleset: Ruleset, gameId?: string) => void;
  reset: () => void;

  // Field edits
  setName: (name: string) => void;
  setPlaybook: (playbookId: string) => void;
  setAttribute: (attributeId: string, value: number) => void;
  setActionRating: (actionId: string, value: number) => void;
  toggleAbility: (abilityId: string) => void;
  setIdentityField: (field: 'heritage' | 'background' | 'vice', value: string) => void;
  setCustom: (key: string, value: unknown) => void;

  // Navigation
  goNext: () => void;
  goBack: () => void;
  goToStep: (index: number) => void;

  // Validation + submit
  isStepValid: (index: number) => boolean;
  /** The first blocking validation message for a step (so the footer can say *why* Next is off). */
  stepError: (index: number) => string | null;
  canSubmit: () => boolean;
  submit: () => Promise<string | null>;
}

const initialDraftState = {
  ruleset: null as Ruleset | null,
  steps: [] as WizardStepMeta[],
  gameId: null as string | null,
  rulesetId: null as string | null,
  name: '',
  draft: emptyDraft(),
  stepIndex: 0,
  isLoading: false,
  error: null as string | null,
  lastUpdated: undefined as Date | undefined,
};

export const useCharacterCreationStore = create<CharacterCreationState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialDraftState,

        initFromRuleset: (ruleset, gameId) => {
          const steps = deriveSteps(ruleset);
          // Standalone create (Phase 5) passes no gameId; resume keys on (gameId, rulesetId).
          const nextGameId = gameId ?? null;
          const isSameDraft = get().gameId === nextGameId && get().rulesetId === ruleset.id;
          set(
            isSameDraft
              ? // Resume the persisted draft, just re-attach the live ruleset + steps
                { ruleset, steps, stepIndex: Math.min(get().stepIndex, steps.length - 1) }
              : // New game/ruleset → start fresh
                {
                  ruleset,
                  steps,
                  gameId: nextGameId,
                  rulesetId: ruleset.id,
                  name: '',
                  draft: emptyDraft(),
                  stepIndex: 0,
                  error: null,
                }
          );
        },

        reset: () => set({ ...initialDraftState, draft: emptyDraft() }),

        setName: name => set({ name }),

        setPlaybook: playbookId => {
          const content = get().ruleset?.content;
          const playbook = content?.playbooks.find(p => p.id === playbookId);
          set(state => {
            // Seed the allocator from the playbook's baseline. In action-rating mode the playbook
            // seeds starting ACTION dots and attributes are DERIVED; otherwise seed attributes.
            const skills = { ...(playbook?.skills ?? {}) };
            const next: CharacterData = {
              ...state.draft,
              playbook: playbookId,
              skills,
              specialAbilities: [...(playbook?.startingAbilities ?? [])],
              attributes: { ...(playbook?.attributes ?? {}) },
            };
            if (content && usesActionRatings(content)) {
              next.attributes = deriveAttributes(content, next);
            }
            return { draft: next };
          });
        },

        setAttribute: (attributeId, value) =>
          set(state => {
            const content = state.ruleset?.content;
            if (!content) return {};
            const attrDef = content.attributes.find(a => a.id === attributeId);
            const cap = attrDef?.maxValue ?? 4;
            // Clamp to the attribute cap AND to what the point-buy budget can afford.
            const affordable = maxAffordableRating(
              content,
              state.draft.attributes,
              attributeId,
              cap
            );
            const next = Math.max(0, Math.min(value, affordable));
            return {
              draft: {
                ...state.draft,
                attributes: { ...state.draft.attributes, [attributeId]: next },
              },
            };
          }),

        setActionRating: (actionId, value) =>
          set(state => {
            const content = state.ruleset?.content;
            if (!content || !usesActionRatings(content)) return {};
            const ar = content.characterCreation?.actionRatings;
            // Creation cap = the lower of the action's absolute max and its at-creation cap.
            const cap = Math.min(ar?.max ?? 3, ar?.maxAtCreation ?? 2);
            // Action-dot budget = playbook's seeded dots + the ruleset's creation `points`.
            const playbook = content.playbooks.find(p => p.id === state.draft.playbook);
            const seeded = Object.values(playbook?.skills ?? {}).reduce(
              (n, v) => n + Math.max(0, v),
              0
            );
            const budget = seeded + (ar?.points ?? 0);
            const others = actionDotsSpent(content, {
              ...state.draft,
              skills: { ...state.draft.skills, [actionId]: 0 },
            });
            const next = Math.max(0, Math.min(value, cap, budget - others));
            const skills = { ...state.draft.skills, [actionId]: next };
            return {
              draft: {
                ...state.draft,
                skills,
                attributes: deriveAttributes(content, { ...state.draft, skills }),
              },
            };
          }),

        toggleAbility: abilityId =>
          set(state => {
            const content = state.ruleset?.content;
            if (!content) return {};
            const { specialAbilities, playbook } = state.draft;
            const has = specialAbilities.includes(abilityId);
            const limit = abilityChoiceLimit(content, playbook);
            // Single-slot pick (BitD: exactly ONE ability at creation) → radio semantics. Clicking
            // the current pick keeps it (a character must start with an ability — can't drop to zero);
            // clicking a different UNLOCKED ability SWAPS to it rather than being a dead no-op. (Gaining
            // ADDITIONAL abilities happens later via XP advancement in the editor, not this toggle.)
            if (limit === 1) {
              if (has) return {};
              if (!isAbilityUnlocked(content, state.draft, abilityId)) return {};
              return { draft: { ...state.draft, specialAbilities: [abilityId] } };
            }
            // Multi-select: toggle off if held, else add up to the limit (tier/prereq gated).
            if (has)
              return {
                draft: {
                  ...state.draft,
                  specialAbilities: specialAbilities.filter(a => a !== abilityId),
                },
              };
            if (specialAbilities.length >= limit) return {};
            if (!isAbilityUnlocked(content, state.draft, abilityId)) return {};
            return {
              draft: { ...state.draft, specialAbilities: [...specialAbilities, abilityId] },
            };
          }),

        setIdentityField: (field, value) =>
          set(state => ({ draft: { ...state.draft, [field]: value } })),

        setCustom: (key, value) =>
          set(state => ({
            draft: { ...state.draft, custom: { ...state.draft.custom, [key]: value } },
          })),

        goNext: () => {
          const { stepIndex, steps } = get();
          if (stepIndex < steps.length - 1) set({ stepIndex: stepIndex + 1 });
        },
        goBack: () => {
          const { stepIndex } = get();
          if (stepIndex > 0) set({ stepIndex: stepIndex - 1 });
        },
        goToStep: index => {
          const { steps } = get();
          if (index >= 0 && index < steps.length) set({ stepIndex: index });
        },

        isStepValid: index => {
          const { steps, draft, name, ruleset } = get();
          const step = steps[index];
          const content = ruleset?.content;
          if (!step || !content) return false;
          const kind = stepKind(step.id);
          const { errors, isValid } = validateCharacter(content, draft, { mode: 'creation' });
          // The review step gates on the WHOLE build being valid (+ a name).
          if (kind === 'review')
            return isValid && name.trim().length > 0 && draft.playbook.length > 0;
          // Other steps gate only on errors that belong to that step.
          return !errors.some(e => errorBelongsToStep(e.field, kind, step.id));
        },

        stepError: index => {
          const { steps, draft, ruleset } = get();
          const step = steps[index];
          const content = ruleset?.content;
          if (!step || !content) return null;
          const kind = stepKind(step.id);
          const { errors } = validateCharacter(content, draft, { mode: 'creation' });
          // Review gates on the whole build — surface the first error anywhere so the user knows
          // what to go fix. Other steps surface only the first error that belongs to that step.
          const e =
            kind === 'review'
              ? errors[0]
              : errors.find(er => errorBelongsToStep(er.field, kind, step.id));
          return e?.message ?? null;
        },

        canSubmit: () => {
          const { name, draft, ruleset } = get();
          const content = ruleset?.content;
          if (!content) return false;
          return (
            name.trim().length > 0 &&
            validateCharacter(content, draft, { mode: 'creation' }).isValid
          );
        },

        submit: async () => {
          const { name, draft, gameId, rulesetId, canSubmit } = get();
          // A character is created either inside a campaign (gameId) or standalone against a ruleset
          // (rulesetId) — Phase 5 portable characters.
          if (!canSubmit() || (!gameId && !rulesetId)) {
            useNotificationStore
              .getState()
              .warning('Incomplete character', 'Add a name and pick a playbook first.');
            return null;
          }

          const userId = useAuthStore.getState().user?.id;
          if (!userId) {
            useNotificationStore
              .getState()
              .error('Not signed in', 'You must be signed in to create a character.');
            return null;
          }

          set({ isLoading: true, error: null });
          try {
            const data: CreateCharacterData = {
              // gameId present → create in-campaign; otherwise standalone, bound to rulesetId.
              ...(gameId ? { gameId } : {}),
              ...(rulesetId ? { rulesetId } : {}),
              name: name.trim(),
              characterData: draft,
              playbookType: draft.playbook,
            };
            // Route through the validated create so the server enforces the same rules.
            const result =
              await getRepositories().characterManagement.createCharacterWithValidation(
                userId,
                data
              );
            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to create character');
            }
            set({ isLoading: false, lastUpdated: new Date() });
            useNotificationStore
              .getState()
              .success('Character created', `${name.trim()} is ready to play.`);
            return result.data.id;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create character';
            set({ error: message, isLoading: false });
            useNotificationStore.getState().error('Could not create character', message);
            return null;
          }
        },
      }),
      {
        name: 'character-creation-store',
        // Persist only the in-progress draft — never the (large, live) ruleset.
        partialize: state => ({
          gameId: state.gameId,
          rulesetId: state.rulesetId,
          name: state.name,
          draft: state.draft,
          stepIndex: state.stepIndex,
        }),
      }
    ),
    { name: 'character-creation-store' }
  )
);
