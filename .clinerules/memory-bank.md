## Brief overview

This rule establishes Cline's Memory Bank system - a comprehensive documentation framework that compensates for memory resets between sessions. Since Cline's memory resets completely between sessions, the Memory Bank serves as the only link to previous work and must be maintained with precision and clarity. This system consists of hierarchical markdown files that build project understanding from foundation to current state.

## Memory reset behavior

- Cline's memory resets completely between sessions - this is not a limitation but drives perfect documentation
- After each reset, Cline relies ENTIRELY on the Memory Bank to understand projects and continue work
- Cline MUST read ALL memory bank files at the start of EVERY task - this is not optional
- The Memory Bank is the only source of project continuity and context

## Memory Bank file structure

Core files in hierarchical order (all required):
- `projectbrief.md` - Foundation document, created at project start if missing, defines core requirements and scope
- `productContext.md` - Why project exists, problems solved, user experience goals
- `activeContext.md` - Current work focus, recent changes, next steps, active decisions, patterns, insights
- `systemPatterns.md` - System architecture, technical decisions, design patterns, component relationships
- `techContext.md` - Technologies used, development setup, constraints, dependencies, tool patterns
- `progress.md` - What works, what's left to build, current status, known issues, decision evolution

Additional context files created within memory-bank/ when helpful for organization:
- Complex feature documentation
- Integration specifications
- API documentation
- Testing strategies
- Deployment procedures

## Plan Mode workflow

1. Start by reading Memory Bank files
2. Check if files are complete and current
3. If incomplete: Create plan and document in chat
4. If complete: Verify context, develop strategy, present approach
5. Focus on understanding project state before proposing changes

## Act Mode workflow

1. Check Memory Bank for current context
2. Update documentation as needed
3. Execute assigned task
4. Document changes and their impact
5. Maintain Memory Bank accuracy throughout work

## Documentation update triggers

Memory Bank updates occur when:
- Discovering new project patterns or insights
- After implementing significant changes
- When user explicitly requests "update memory bank" (MUST review ALL files)
- When context needs clarification or correction
- When architectural decisions are made

## Memory Bank update process

When triggered by "update memory bank" request:
- MUST review every memory bank file, even if some don't require updates
- Focus particularly on activeContext.md and progress.md as they track current state
- Document current project state accurately
- Clarify next steps and priorities
- Record insights and patterns discovered
- Ensure all files reflect accurate project understanding

## File relationship hierarchy

Files build upon each other:
- projectbrief.md shapes all other files
- productContext.md, systemPatterns.md, and techContext.md extend the brief
- activeContext.md synthesizes information from the above three
- progress.md builds on activeContext.md to track evolution

## Critical principles

- Memory Bank accuracy is essential for project continuity
- Documentation must be precise and clear since it's the only project memory
- Each session begins fresh - documentation quality determines effectiveness
- Files must be kept current and relevant to project state
- Focus on actionable information that enables immediate productive work
