// Webpack loader: backports one line of React's fix for a lost wake-up, into the
// copy of React that Next bundles for the browser (package.json's `react` version
// doesn't change it). Without it, a page refresh after a save can sit unfinished
// until some other update happens, e.g. a toast timing out about 4 seconds later.
//
// When React suspends on data that has already arrived, it is told so straight
// away, in the middle of rendering. If it is already waiting to stay on the
// previous screen, the buggy code can't restart there, so it drops the signal and
// nothing retries. The fix records the signal so the render is retried.
//
// Present in Next 15.5.18 to 15.5.29; fixed in the React inside Next 16.4.5. Once
// Next is upgraded to a fixed version, delete this file and its rule in next.config.mjs.
const BUGGY = /(0 === \(executionContext & 2\)|\(executionContext & RenderContext\) === NoContext)\s*&&\s*prepareFreshStack\(root, 0\)\s*:\s*\(workInProgressRootPingedLanes \|= pingedLanes\)/;
const FIXED = /\?\s*prepareFreshStack\(root, 0\)\s*:\s*\(workInProgressRootPingedLanes \|= pingedLanes\)/;

module.exports = function reactPingFix(source) {
  if (FIXED.test(source)) return source;
  if (!BUGGY.test(source)) {
    throw new Error('react-ping-fix-loader: pingSuspendedRoot not recognised in this Next version. Check whether it is fixed, then update or remove this loader.');
  }
  return source.replace(BUGGY, '$1 ? prepareFreshStack(root, 0) : (workInProgressRootPingedLanes |= pingedLanes) : (workInProgressRootPingedLanes |= pingedLanes)');
};
