import { GameSystemConfig } from './types'
import { EXAMPLE_MECHANICS } from './constants'

/**
 * Generic content loader for user-provided game systems
 * This enables copyright-safe loading of game content from user files
 */

export class ContentLoader {
    private static loadedSystems: Map<string, GameSystemConfig> = new Map()

    /**
     * Load a game system from user-provided configuration
     * Users provide their own JSON/TS files that are gitignored
     */
    static async loadGameSystem(systemId: string): Promise<GameSystemConfig | null> {
        // Check cache first
        if (this.loadedSystems.has(systemId)) {
            return this.loadedSystems.get(systemId)!
        }

        try {
            // In a real implementation, this would load from:
            // - User-provided JSON files in content/ directory (gitignored)
            // - User-uploaded configurations
            // - Database-stored custom systems

            // For now, return example system to demonstrate structure
            if (systemId === 'example') {
                const exampleSystem: GameSystemConfig = {
                    id: 'example',
                    name: 'Example TTRPG System',
                    version: '1.0.0',
                    description: 'A generic example system showing the framework capabilities',
                    mechanics: EXAMPLE_MECHANICS,
                    playbooks: [
                        {
                            id: 'warrior',
                            name: 'Warrior',
                            description: 'A generic fighter archetype',
                            specialAbilities: ['Combat Training', 'Armor Expertise'],
                            startingActions: { 'fight': 2, 'move': 1 },
                            startingItems: ['sword', 'shield', 'armor']
                        },
                        {
                            id: 'scholar',
                            name: 'Scholar',
                            description: 'A knowledge-focused archetype',
                            specialAbilities: ['Research', 'Ancient Knowledge'],
                            startingActions: { 'study': 2, 'observe': 1 },
                            startingItems: ['books', 'writing tools', 'lantern']
                        }
                    ],
                    attributes: [
                        {
                            id: 'might',
                            name: 'Might',
                            description: 'Physical power and endurance',
                            actions: ['fight', 'force', 'endure']
                        },
                        {
                            id: 'intellect',
                            name: 'Intellect',
                            description: 'Mental acuity and reasoning',
                            actions: ['study', 'analyze', 'remember']
                        }
                    ],
                    actions: [
                        {
                            id: 'fight',
                            name: 'Fight',
                            description: 'Engage in physical combat',
                            attribute: 'might'
                        },
                        {
                            id: 'study',
                            name: 'Study',
                            description: 'Research and learn',
                            attribute: 'intellect'
                        }
                    ]
                }

                this.loadedSystems.set(systemId, exampleSystem)
                return exampleSystem
            }

            // TODO: Implement actual file loading for user content
            // This would read from:
            // - content/${systemId}.json
            // - content/${systemId}.ts
            // - Database storage

            return null
        } catch (error) {
            console.error(`Failed to load game system: ${systemId}`, error)
            return null
        }
    }

    /**
     * Get all available game systems
     */
    static async getAvailableSystems(): Promise<string[]> {
        // TODO: Scan content directory for available systems
        // TODO: Query database for user-uploaded systems
        return ['example']
    }

    /**
     * Validate a game system configuration
     */
    static validateGameSystem(config: GameSystemConfig): boolean {
        try {
            // Basic validation
            if (!config.id || !config.name || !config.mechanics) {
                return false
            }

            // Validate mechanics
            if (!Array.isArray(config.mechanics.positions) ||
                !Array.isArray(config.mechanics.effects)) {
                return false
            }

            // Validate playbooks
            if (!Array.isArray(config.playbooks)) {
                return false
            }

            // All basic checks passed
            return true
        } catch (error) {
            console.error('Game system validation failed:', error)
            return false
        }
    }

    /**
     * Clear the cache (useful for development/testing)
     */
    static clearCache(): void {
        this.loadedSystems.clear()
    }
}

/**
 * Helper function to load and validate a game system
 */
export async function loadGameSystem(systemId: string): Promise<GameSystemConfig | null> {
    const system = await ContentLoader.loadGameSystem(systemId)

    if (system && ContentLoader.validateGameSystem(system)) {
        return system
    }

    return null
}

/**
 * Get the default example system for testing/demo purposes
 */
export async function getExampleSystem(): Promise<GameSystemConfig> {
    const system = await loadGameSystem('example')
    if (!system) {
        throw new Error('Failed to load example system')
    }
    return system
}
