import { installInterceptor } from '../page/intercept';
import { MATCHES } from '../platform/matches';

// Declarative injection into the page's own JavaScript world: the variant that passed 14/14 in
// the spike. If another browser needs a different method, only this file changes.
export default defineContentScript({
  matches: MATCHES,
  world: 'MAIN',
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  main() {
    installInterceptor(window);
  },
});
