import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Character,
  CharacterWithDetails,
  CreateCharacterData,
  UpdateCharacterData,
  CharacterStatus,
  CharacterAdvancement,
} from '@heist-mind/database';
import { LoadingState } from '@/shared/types';
import { getRepositories } from '@/lib/auth';

interface CharactersState extends LoadingState {
  // Character collections
  characters: Character[];
  userCharacters: Character[];
  gameCharacters: Record<string, Character[]>;
  characterDetails: Record<string, CharacterWithDetails>;
  selectedCharacter: CharacterWithDetails | null;

  // Filters
  filters: {
    gameId?: string;
    status?: CharacterStatus[];
    playbookType?: string;
    search?: string;
  };

  // Actions - Character CRUD
  loadCharacters: (refresh?: boolean) => Promise<void>;
  loadUserCharacters: (userId: string, refresh?: boolean) => Promise<void>;
  loadGameCharacters: (gameId: string, refresh?: boolean) => Promise<void>;
  loadCharacterDetails: (characterId: string, refresh?: boolean) => Promise<void>;
  createCharacter: (data: CreateCharacterData) => Promise<Character>;
  updateCharacter: (characterId: string, data: UpdateCharacterData) => Promise<Character>;
  deleteCharacter: (characterId: string) => Promise<void>;

  // Actions - Character Management
  addExperience: (characterId: string, amount: number, reason: string) => Promise<Character>;
  advanceCharacter: (characterId: string, advancement: CharacterAdvancement) => Promise<Character>;
  transferCharacter: (characterId: string, targetGameId: string) => Promise<Character>;
  cloneCharacter: (characterId: string, targetGameId: string) => Promise<Character>;

  // Actions - Selection & Filters
  selectCharacter: (characterId: string) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<CharactersState['filters']>) => void;
  clearFilters: () => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCharactersStore = create<CharactersState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        characters: [],
        userCharacters: [],
        gameCharacters: {},
        characterDetails: {},
        selectedCharacter: null,
        isLoading: false,
        error: null,
        lastUpdated: undefined,

        filters: {},

        // Character CRUD operations
        loadCharacters: async (refresh = false) => {
          if (refresh) {
            set({ characters: [] });
          }

          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            // Note: This would typically be a search/filter endpoint
            const result = await repositories.characters.findByPlayer('current-user-id'); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to load characters');
            }

            set({
              characters: result.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load characters',
              isLoading: false,
            });
            throw error;
          }
        },

        loadUserCharacters: async (userId: string, refresh = false) => {
          if (refresh) {
            set({ userCharacters: [] });
          }

          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.findByPlayer(userId);

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to load user characters');
            }

            set({
              userCharacters: result.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load user characters',
              isLoading: false,
            });
            throw error;
          }
        },

        loadGameCharacters: async (gameId: string, refresh = false) => {
          const { gameCharacters } = get();

          if (refresh || !gameCharacters[gameId]) {
            set({ isLoading: true, error: null });
            try {
              const repositories = getRepositories();
              const result = await repositories.characters.findByGame(gameId);

              if (!result.success) {
                throw new Error(result.error?.message || 'Failed to load game characters');
              }

              set(state => ({
                gameCharacters: {
                  ...state.gameCharacters,
                  [gameId]: result.data,
                },
                isLoading: false,
                lastUpdated: new Date(),
              }));
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load game characters',
                isLoading: false,
              });
              throw error;
            }
          }
        },

        loadCharacterDetails: async (characterId: string, refresh = false) => {
          const { characterDetails } = get();

          if (!refresh && characterDetails[characterId]) {
            set({ selectedCharacter: characterDetails[characterId] });
            return;
          }

          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.findWithDetails(characterId);

            if (!result.success) {
              throw new Error('Character not found');
            }

            if (!result.data) {
              throw new Error('Character not found');
            }

            set(state => ({
              characterDetails: {
                ...state.characterDetails,
                [characterId]: result.data!,
              },
              selectedCharacter: result.data!,
              isLoading: false,
              lastUpdated: new Date(),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load character details',
              isLoading: false,
            });
            throw error;
          }
        },

        createCharacter: async (data: CreateCharacterData) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.create('current-user-id', data); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to create character');
            }

            const newCharacter = result.data;

            set(state => ({
              characters: [newCharacter, ...state.characters],
              userCharacters: [newCharacter, ...state.userCharacters],
              gameCharacters: {
                ...state.gameCharacters,
                [data.gameId]: state.gameCharacters[data.gameId]
                  ? [newCharacter, ...(state.gameCharacters[data.gameId] || [])]
                  : [newCharacter],
              },
              isLoading: false,
              lastUpdated: new Date(),
            }));

            return newCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create character',
              isLoading: false,
            });
            throw error;
          }
        },

        updateCharacter: async (characterId: string, data: UpdateCharacterData) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.update(
              characterId,
              'current-user-id',
              data
            ); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to update character');
            }

            const updatedCharacter = result.data;

            set(state => ({
              characters: state.characters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              userCharacters: state.userCharacters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              gameCharacters: Object.fromEntries(
                Object.entries(state.gameCharacters).map(([gameId, chars]) => [
                  gameId,
                  chars.map(char => (char.id === characterId ? updatedCharacter : char)),
                ])
              ),
              characterDetails: state.characterDetails[characterId]
                ? {
                    ...state.characterDetails,
                    [characterId]: { ...state.characterDetails[characterId], ...updatedCharacter },
                  }
                : state.characterDetails,
              selectedCharacter:
                state.selectedCharacter?.id === characterId
                  ? { ...state.selectedCharacter, ...updatedCharacter }
                  : state.selectedCharacter,
              isLoading: false,
              lastUpdated: new Date(),
            }));

            return updatedCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update character',
              isLoading: false,
            });
            throw error;
          }
        },

        deleteCharacter: async (characterId: string) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.delete(characterId, 'current-user-id'); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to delete character');
            }

            set(state => ({
              characters: state.characters.filter(char => char.id !== characterId),
              userCharacters: state.userCharacters.filter(char => char.id !== characterId),
              gameCharacters: Object.fromEntries(
                Object.entries(state.gameCharacters).map(([gameId, chars]) => [
                  gameId,
                  chars.filter(char => char.id !== characterId),
                ])
              ),
              characterDetails: Object.fromEntries(
                Object.entries(state.characterDetails).filter(([id]) => id !== characterId)
              ),
              selectedCharacter:
                state.selectedCharacter?.id === characterId ? null : state.selectedCharacter,
              isLoading: false,
              lastUpdated: new Date(),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete character',
              isLoading: false,
            });
            throw error;
          }
        },

        // Character management operations
        addExperience: async (characterId: string, amount: number, reason: string) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.addExperience(
              characterId,
              'current-user-id',
              amount,
              reason
            ); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to add experience');
            }

            const updatedCharacter = result.data;

            // Update character state directly since we already have the updated character
            set(state => ({
              characters: state.characters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              userCharacters: state.userCharacters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              gameCharacters: Object.fromEntries(
                Object.entries(state.gameCharacters).map(([gameId, chars]) => [
                  gameId,
                  chars.map(char => (char.id === characterId ? updatedCharacter : char)),
                ])
              ),
              characterDetails: state.characterDetails[characterId]
                ? {
                    ...state.characterDetails,
                    [characterId]: { ...state.characterDetails[characterId], ...updatedCharacter },
                  }
                : state.characterDetails,
              selectedCharacter:
                state.selectedCharacter?.id === characterId
                  ? { ...state.selectedCharacter, ...updatedCharacter }
                  : state.selectedCharacter,
            }));

            set({ isLoading: false });
            return updatedCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add experience',
              isLoading: false,
            });
            throw error;
          }
        },

        advanceCharacter: async (characterId: string, advancement: CharacterAdvancement) => {
          set({ isLoading: true, error: null });
          try {
            // This would use the character management repository
            const repositories = getRepositories();
            const result = await repositories.characterManagement.advanceCharacter(
              characterId,
              'current-user-id',
              advancement
            ); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to advance character');
            }

            const updatedCharacter = result.data;

            // Update character state directly since we already have the updated character
            set(state => ({
              characters: state.characters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              userCharacters: state.userCharacters.map(char =>
                char.id === characterId ? updatedCharacter : char
              ),
              gameCharacters: Object.fromEntries(
                Object.entries(state.gameCharacters).map(([gameId, chars]) => [
                  gameId,
                  chars.map(char => (char.id === characterId ? updatedCharacter : char)),
                ])
              ),
              characterDetails: state.characterDetails[characterId]
                ? {
                    ...state.characterDetails,
                    [characterId]: { ...state.characterDetails[characterId], ...updatedCharacter },
                  }
                : state.characterDetails,
              selectedCharacter:
                state.selectedCharacter?.id === characterId
                  ? { ...state.selectedCharacter, ...updatedCharacter }
                  : state.selectedCharacter,
            }));

            set({ isLoading: false });
            return updatedCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to advance character',
              isLoading: false,
            });
            throw error;
          }
        },

        transferCharacter: async (characterId: string, targetGameId: string) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.transferToGame(
              characterId,
              targetGameId,
              'current-user-id'
            ); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to transfer character');
            }

            const transferredCharacter = result.data;

            // Update character state directly and refresh game characters
            set(state => ({
              characters: state.characters.map(char =>
                char.id === characterId ? transferredCharacter : char
              ),
              userCharacters: state.userCharacters.map(char =>
                char.id === characterId ? transferredCharacter : char
              ),
              gameCharacters: Object.fromEntries(
                Object.entries(state.gameCharacters).map(([gameId, chars]) => [
                  gameId,
                  chars.map(char => (char.id === characterId ? transferredCharacter : char)),
                ])
              ),
              characterDetails: state.characterDetails[characterId]
                ? {
                    ...state.characterDetails,
                    [characterId]: {
                      ...state.characterDetails[characterId],
                      ...transferredCharacter,
                    },
                  }
                : state.characterDetails,
              selectedCharacter:
                state.selectedCharacter?.id === characterId
                  ? { ...state.selectedCharacter, ...transferredCharacter }
                  : state.selectedCharacter,
            }));
            await get().loadGameCharacters(targetGameId, true);

            set({ isLoading: false });
            return transferredCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to transfer character',
              isLoading: false,
            });
            throw error;
          }
        },

        cloneCharacter: async (characterId: string, targetGameId: string) => {
          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.characters.cloneCharacter(
              characterId,
              targetGameId,
              'current-user-id'
            ); // TODO: Get from auth

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to clone character');
            }

            const clonedCharacter = result.data;

            // Add cloned character to collections
            set(state => ({
              characters: [clonedCharacter, ...state.characters],
              userCharacters: [clonedCharacter, ...state.userCharacters],
              gameCharacters: {
                ...state.gameCharacters,
                [targetGameId]: state.gameCharacters[targetGameId]
                  ? [clonedCharacter, ...state.gameCharacters[targetGameId]]
                  : [clonedCharacter],
              },
              isLoading: false,
              lastUpdated: new Date(),
            }));

            return clonedCharacter;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to clone character',
              isLoading: false,
            });
            throw error;
          }
        },

        // Selection and filters
        selectCharacter: (characterId: string) => {
          const { characterDetails } = get();
          if (characterDetails[characterId]) {
            set({ selectedCharacter: characterDetails[characterId] });
          } else {
            get().loadCharacterDetails(characterId);
          }
        },

        clearSelection: () => set({ selectedCharacter: null }),

        setFilters: newFilters => {
          set(state => ({
            filters: { ...state.filters, ...newFilters },
          }));
          // Optionally reload characters with new filters
          get().loadCharacters(true);
        },

        clearFilters: () => {
          set({ filters: {} });
          get().loadCharacters(true);
        },

        // State management
        setLoading: (isLoading: boolean) => set({ isLoading }),
        setError: (error: string | null) => set({ error }),
        reset: () =>
          set({
            characters: [],
            userCharacters: [],
            gameCharacters: {},
            characterDetails: {},
            selectedCharacter: null,
            isLoading: false,
            error: null,
            lastUpdated: undefined,
            filters: {},
          }),
      }),
      {
        name: 'characters-store',
        partialize: state => ({
          // Only persist character selection and filters
          selectedCharacter: state.selectedCharacter,
          filters: state.filters,
        }),
      }
    ),
    {
      name: 'characters-store',
    }
  )
);

// Convenience selectors
export const useCharacters = () =>
  useCharactersStore(state => ({
    characters: state.characters,
    userCharacters: state.userCharacters,
    gameCharacters: state.gameCharacters,
    selectedCharacter: state.selectedCharacter,
    isLoading: state.isLoading,
    error: state.error,
    filters: state.filters,
  }));

export const useCharacterActions = () =>
  useCharactersStore(state => ({
    loadCharacters: state.loadCharacters,
    loadUserCharacters: state.loadUserCharacters,
    loadGameCharacters: state.loadGameCharacters,
    loadCharacterDetails: state.loadCharacterDetails,
    createCharacter: state.createCharacter,
    updateCharacter: state.updateCharacter,
    deleteCharacter: state.deleteCharacter,
    addExperience: state.addExperience,
    advanceCharacter: state.advanceCharacter,
    transferCharacter: state.transferCharacter,
    cloneCharacter: state.cloneCharacter,
    selectCharacter: state.selectCharacter,
    clearSelection: state.clearSelection,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
  }));

// Computed selectors
export const useActiveCharacters = () =>
  useCharactersStore(state => state.characters.filter(char => char.status === 'active'));

export const useGameCharacters = (gameId: string) =>
  useCharactersStore(state => state.gameCharacters[gameId] || []);
