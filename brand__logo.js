export const DEFAULT_LOGO_DATA_URL = './brand-logo.png';

export function getBrandLogoDataUrl(settings) {
    const value = String(settings?.logoUrl || '').trim();
    if (value && (/^data:image\//i.test(value) || /^(\.\/|\/|https?:\/\/)/i.test(value))) return value;
    return DEFAULT_LOGO_DATA_URL;
}
