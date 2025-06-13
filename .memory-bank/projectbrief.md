# Project Brief: HeistMind

## Core Purpose
HeistMind is a comprehensive game management platform designed specifically for Blades in the Dark and other Forged in the Dark (FitD) tabletop RPG systems. The platform enables Game Masters to upload custom rulesets and manage games, while providing players with intuitive character creation and progression tools within those game contexts.

## Key User Stories

### Game Master Stories
- **As a game master, I want to be able to upload and manage my own game rules and content** - Supporting custom FitD variants and house rules
- **As a game master, I want to be able to create a game based on the rulesets I uploaded** - Game session management with flexible ruleset application
- **As a game master, I want to be able to invite players to games I create** - Streamlined invitation and player management system

### Player Stories
- **As a player, I want to be able to join a game and create a character based on the rules of that game** - Context-aware character creation within specific game rulesets
- **As a player, I want to be able to add or remove my characters from a game** - Flexible character-to-game relationship management
- **As a player, I want to be able to manage my character's abilities, XP, and level through a modern wizard UI** - Intuitive progression and advancement interface

## Technical Requirements

### Core Architecture Requirements
- **Stability**: Rock-solid foundation with comprehensive error handling and data validation
- **Extensibility**: Plugin-like architecture supporting various FitD game systems and custom rules
- **Multi-tenancy**: Isolated content spaces for Game Masters with proper data separation
- **Security**: Robust permission system ensuring proper data access and game isolation

### Functional Requirements
- **Dynamic Ruleset System**: Support for uploading, validating, and applying custom game rules
- **Game Session Management**: Create, configure, and manage game instances with player invitations
- **Flexible Character System**: Character creation and progression that adapts to different FitD rulesets
- **User Role Management**: Clear distinction between Game Master and Player capabilities
- **Modern UI/UX**: Wizard-based interfaces for complex workflows with intuitive navigation

### Technical Stack Requirements
- **Modern Web Architecture**: Next.js with TypeScript for type safety and developer experience
- **Scalable Backend**: Supabase for authentication, database, and real-time features
- **Responsive Design**: Mobile-first approach supporting various device types
- **Monorepo Structure**: Organized codebase supporting multiple packages and clear separation of concerns

## Project Scope

### In Scope (MVP)
- User authentication and profile management
- Game Master content upload and ruleset management
- Game creation and player invitation system
- Character creation within game-specific rulesets
- Character progression and advancement tracking
- Basic game session management

### In Scope (Future Phases)
- Real-time collaboration during character creation
- Advanced ruleset validation and content moderation
- Character portability between compatible games
- Integration with virtual tabletop platforms
- Mobile application for session support

### Out of Scope (Current Project)
- Real-time gameplay mechanics (dice rolling, turn management)
- Campaign story management and note-taking
- Advanced automation of game rules and mechanics
- Voice/video chat integration
- Marketplace for community-created content

## Success Criteria

### User Experience Goals
- Game Masters can upload and validate custom rulesets within 10 minutes
- Players can join a game and create a character within 5 minutes
- Character progression workflows are intuitive and require minimal learning
- 95% uptime and reliable data persistence

### Technical Goals
- Flexible architecture supporting multiple FitD game variants
- Secure multi-tenant data isolation
- Comprehensive error handling with user-friendly feedback
- Scalable design supporting growth in users and content

## Architecture Philosophy

The project follows Domain-Driven Design principles with emphasis on:
- **User-Centric Design**: All features driven by clear user stories and workflows
- **Extensibility First**: Architecture designed to accommodate new FitD variants and custom rules
- **Data Integrity**: Robust validation ensuring consistent game state and character data
- **Security by Design**: Multi-tenant architecture with proper permission boundaries
- **Modern Development Practices**: Type-safe development, comprehensive testing, and maintainable code

## Legal and Compliance Considerations

### Content Management
- User-generated content policies and validation
- Intellectual property respect for published game systems
- Data privacy and user content ownership

### Platform Responsibility
- Clear terms of service for uploaded content
- Moderation capabilities for inappropriate content
- GDPR compliance for user data handling
- Secure handling of game invitations and user communications

This project brief serves as the foundation for all development decisions and will guide the implementation of HeistMind as a stable, extensible platform for Forged in the Dark game management.
