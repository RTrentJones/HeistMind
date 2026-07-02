// An uploaded/loaded FitD ruleset row; its mechanics live in `content` (ruleset-content.ts).
import type { RulesetContent } from './ruleset-content';

export interface Ruleset {
  id: string;
  createdBy: string;
  name: string;
  description: string | null;
  version: string;
  content: RulesetContent;
  schemaVersion: string;
  sourceFileUrl: string | null;
  backupFileUrl: string | null;
  status: RulesetStatus;
  isPublic: boolean;
  tags: string[];
  compatibilityFlags: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type RulesetStatus = 'draft' | 'published' | 'archived';

export interface CreateRulesetData {
  name: string;
  description?: string;
  version: string;
  content: RulesetContent;
  isPublic?: boolean;
  tags?: string[];
  sourceFileUrl?: string;
}

export interface UpdateRulesetData {
  name?: string;
  description?: string;
  version?: string;
  content?: RulesetContent;
  status?: RulesetStatus;
  isPublic?: boolean;
  tags?: string[];
}
