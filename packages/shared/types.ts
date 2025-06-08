export interface DiceRoll {
  dice: number
  position: 'controlled' | 'risky' | 'desperate'
  effect: 'limited' | 'standard' | 'great'
  result: number
  rolls: number[]
  isSuccess: boolean
  isCrit: boolean
}

export interface Character {
  id: string
  name: string
  playbook: string
  stress: number
  harm: any[]
  stats: Record<string, any>
}
