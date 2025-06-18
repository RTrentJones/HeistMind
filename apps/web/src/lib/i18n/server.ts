import { translations } from '@/lib/i18n/translations'

export function getServerTranslation(key: string, language: string = 'en'): string {
    const keys = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = (translations as Record<string, any>)[language]

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k]
        } else {
            return key // Fallback to key if not found
        }
    }

    return typeof value === 'string' ? value : key
}
