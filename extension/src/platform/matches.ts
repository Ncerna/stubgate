/**
 * Where Stubgate may run: every http and https page, in every frame. Whether a request is
 * actually mocked is decided only by the user's rules (see core/match.ts), so a page with no
 * matching rule is left untouched. Kept in one place: both content scripts and the Firefox
 * host permissions use it.
 *
 * Not included on purpose: file:// (needs a separate user opt-in in Chrome), ftp://, and the
 * browser's own pages (chrome://, about:, extension stores), which extensions cannot touch.
 */
export const MATCHES = ['http://*/*', 'https://*/*'];
