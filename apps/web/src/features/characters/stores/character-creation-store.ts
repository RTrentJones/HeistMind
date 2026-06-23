import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Ruleset, CharacterData, CreateCharacterData } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useNotificationStore } from '@/shared/stores/notification-store';
import type { LoadingState } from '@/shared/types';
import { deriveSteps, emptyDraft, stepKind, type WizardStepMeta } from '../lib/creation-steps';

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
  initFromRuleset: (ruleset: Ruleset, gameId: string) => void;
  reset: () => void;

  // Field edits
  setName: (name: string) => void;
  setPlaybook: (playbookId: string) => void;
  setAttribute: (attributeId: string, value: number) => void;
  toggleAbility: (abilityId: string) => void;
  setIdentityField: (field: 'heritage' | 'background' | 'vice', value: string) => void;
  setCustom: (key: string, value: unknown) => void;

  // Navigation
  goNext: () => void;
  goBack: () => void;
  goToStep: (index: number) => void;

  // Validation + submit
  isStepValid: (index: number) => boolean;
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
          const isSameDraft = get().gameId === gameId && get().rulesetId === ruleset.id;
          set(
            isSameDraft
              ? // Resume the persisted draft, just re-attach the live ruleset + steps
                { ruleset, steps, stepIndex: Math.min(get().stepIndex, steps.length - 1) }
              : // New game/ruleset → start fresh
                {
                  ruleset,
                  steps,
                  gameId,
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
          const ruleset = get().ruleset;
          const playbook = ruleset?.content.playbooks.find(p => p.id === playbookId);
          set(state => ({
            draft: {
              ...state.draft,
              playbook: playbookId,
              // Seed the allocator from the playbook's baseline (action ratings,
              // skills, and starting abilities) — the player tunes from there.
              attributes: { ...(playbook?.attributes ?? {}) },
              skills: { ...(playbook?.skills ?? {}) },
              specialAbilities: [...(playbook?.startingAbilities ?? [])],
            },
          }));
        },

        setAttribute: (attributeId, value) =>
          set(state => ({
            draft: {
              ...state.draft,
              attributes: { ...state.draft.attributes, [attributeId]: Math.max(0, value) },
            },
          })),

        toggleAbility: abilityId =>
          set(state => {
            const has = state.draft.specialAbilities.includes(abilityId);
            return {
              draft: {
                ...state.draft,
                specialAbilities: has
                  ? state.draft.specialAbilities.filter(a => a !== abilityId)
                  : [...state.draft.specialAbilities, abilityId],
              },
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
          const { steps, draft, name } = get();
          const step = steps[index];
          if (!step) return false;
          if (!step.required) return true;
          switch (stepKind(step.id)) {
            case 'playbook':
              return draft.playbook.length > 0;
            case 'attributes':
              return Object.values(draft.attributes).some(v => v > 0);
            case 'review':
              return name.trim().length > 0 && draft.playbook.length > 0;
            default:
              return true;
          }
        },

        canSubmit: () => {
          const { name, draft } = get();
          return name.trim().length > 0 && draft.playbook.length > 0;
        },

        submit: async () => {
          const { name, draft, gameId, canSubmit } = get();
          if (!canSubmit() || !gameId) {
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
              gameId,
              name: name.trim(),
              characterData: draft,
              playbookType: draft.playbook,
            };
            const result = await getRepositories().characters.create(userId, data);
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
