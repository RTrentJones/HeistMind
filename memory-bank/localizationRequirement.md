# CRITICAL REQUIREMENT: Localization System

## ABSOLUTE MANDATE

**ALL strings in React components MUST be managed through a centralized localization system following industry best practices.**

This is a **NON-NEGOTIABLE** requirement that applies to:
- ALL user-facing text in components
- ALL button labels, form labels, headings
- ALL error messages and notifications
- ALL tooltips, placeholders, and help text
- ALL navigation and menu items
- ALL static content and descriptions

## Implementation Requirements

### 1. No Hardcoded Strings in Components
```typescript
// ❌ FORBIDDEN - Hardcoded strings
const Header = () => (
  <h1>Welcome to HeistMind</h1>
)

// ✅ REQUIRED - Localized strings
const Header = () => {
  const t = useTranslation()
  return <h1>{t('common.welcome.title')}</h1>
}
```

### 2. Centralized Translation Keys
All translation keys must be organized in a structured hierarchy:
```typescript
// translations/en.json
{
  "common": {
    "welcome": {
      "title": "Welcome to HeistMind",
      "subtitle": "Forged in the Dark"
    },
    "actions": {
      "signIn": "Sign In",
      "signUp": "Join the Shadows",
      "dashboard": "Dashboard"
    }
  },
  "navigation": {
    "about": "About",
    "features": "Features",
    "community": "Community",
    "docs": "Documentation"
  }
}
```

### 3. Type-Safe Translation System
The localization system must provide full TypeScript support:
```typescript
// Type-safe translation keys
type TranslationKey =
  | 'common.welcome.title'
  | 'common.welcome.subtitle'
  | 'common.actions.signIn'
  | 'navigation.about'
  // ... all keys

const useTranslation = () => {
  const t = (key: TranslationKey, params?: Record<string, any>) => string
  return { t }
}
```

### 4. Parameterized Translations
Support for dynamic content injection:
```typescript
// translations/en.json
{
  "user": {
    "greeting": "Welcome back, {{name}}!",
    "characterCount": "You have {{count}} character{{count, plural, one {} other {s}}}"
  }
}

// Component usage
const t = useTranslation()
return <p>{t('user.greeting', { name: user.name })}</p>
```

## Development Workflow

### 1. Before Creating ANY Component
1. Define all text content in translation files FIRST
2. Create properly structured translation keys
3. Only then create components using translation hooks

### 2. Component Creation Pattern
```typescript
// REQUIRED: Every component follows this pattern
import { useTranslation } from '@/lib/i18n'

export function ComponentName() {
  const t = useTranslation()

  return (
    <div>
      <h1>{t('component.title')}</h1>
      <p>{t('component.description')}</p>
      <button>{t('component.action')}</button>
    </div>
  )
}
```

### 3. Translation File Organization
```
src/
├── lib/
│   └── i18n/
│       ├── index.ts          # Main i18n setup
│       ├── hooks.ts          # Translation hooks
│       └── translations/
│           ├── en.json       # English (default)
│           ├── es.json       # Spanish
│           ├── fr.json       # French
│           └── index.ts      # Export all translations
```

## Technology Requirements

### Framework Selection
- **next-i18next** or **react-i18next** for React integration
- **Namespace organization** for logical grouping
- **Lazy loading** of translation bundles
- **Pluralization support** for count-dependent text
- **Date/time/number formatting** support

### File Format
- **JSON format** for translation files
- **Nested structure** for logical organization
- **Consistent naming conventions** (kebab-case or camelCase)
- **Parameter interpolation** syntax

### Build Integration
- **Translation validation** in CI/CD pipeline
- **Missing key detection** during development
- **Unused key detection** for cleanup
- **Bundle optimization** for production

## Quality Standards

### Translation Key Naming
```typescript
// ✅ Good: Descriptive, hierarchical
'components.header.navigation.signIn'
'pages.dashboard.welcome.title'
'forms.characterCreation.steps.attributes'

// ❌ Bad: Flat, unclear
'signIn'
'title'
'button1'
```

### Content Organization
```json
{
  "components": {
    "header": { /* Header-specific translations */ },
    "footer": { /* Footer-specific translations */ }
  },
  "pages": {
    "home": { /* Home page translations */ },
    "dashboard": { /* Dashboard translations */ }
  },
  "common": {
    "actions": { /* Reusable action labels */ },
    "messages": { /* Common messages */ }
  }
}
```

## Error Prevention

### ESLint Rules
Custom ESLint rules to prevent:
- Hardcoded strings in JSX
- Missing translation keys
- Unused translation keys
- Invalid translation parameters

### TypeScript Integration
- Generated types from translation files
- Compile-time key validation
- Parameter type checking
- IDE autocomplete support

## This Requirement is BLOCKING

**NO COMPONENT DEVELOPMENT can proceed without the localization system in place.**

All components must be built with localization from the start - retrofitting is not acceptable.

This applies to:
- Landing page components
- Authentication flows
- Dashboard interfaces
- Character creation wizards
- All user-facing elements

## Implementation Priority

1. **FIRST**: Build complete localization framework
2. **SECOND**: Create all translation files and keys
3. **THIRD**: Create reusable translation hooks
4. **FOURTH**: Begin component development using translations
5. **NEVER**: Create components with hardcoded strings

This requirement is fundamental to the international success and professional quality of HeistMind.
