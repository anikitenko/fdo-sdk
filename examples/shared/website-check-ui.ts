import { DOM, DOMText } from '@anikitenko/fdo-sdk';

/** One isolated style owner per render; no dependence on Blueprint CSS classes. */
export function createWebsiteCheckUI() {
    const dom = new DOM();
    const text = new DOMText();
    dom.collectStylesFrom(text);
    const styles = {
        shell: dom.createClassFromStyle({
            maxWidth: '920px', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)',
            display: 'grid', gap: '24px', color: 'inherit', fontFamily: 'inherit',
            '& h1': {margin: '0', fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: '1.2'},
            '& h2': {margin: '0 0 12px', fontSize: '18px'},
            '& p': {margin: '0', lineHeight: '1.6'},
            '& code': {overflowWrap: 'anywhere', fontSize: '0.9em'},
        }),
        card: dom.createClassFromStyle({
            border: '1px solid rgba(127, 127, 127, 0.3)', borderRadius: '12px',
            background: 'var(--fdo-ui-background, rgba(127, 127, 127, 0.05))',
            padding: '24px', display: 'grid', gap: '16px', minWidth: '0',
            '@media (max-width: 560px)': {padding: '16px'},
        }),
        grid: dom.createClassFromStyle({
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px',
            '@media (max-width: 640px)': {gridTemplateColumns: '1fr'},
        }),
        eyebrow: dom.createClassFromStyle({fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: '0.75'}),
        badge: dom.createClassFromStyle({
            display: 'inline-flex', justifySelf: 'start', borderRadius: '999px', padding: '6px 12px',
            fontSize: '12px', fontWeight: '600', background: 'rgba(45, 114, 210, 0.12)',
        }),
    };
    return {dom, text, styles};
}
