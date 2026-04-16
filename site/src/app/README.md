# Site app slices

`site/src/app.js` is now only a thin manifest.

Runtime slices are loaded in order:

1. `00-config-state.js`
2. `20-storage-selections.js`
3. `30-domain.js`
4. `32-object-domain.js`
5. `40-ui.js`
6. `42-object-ui.js`
7. `50-diagnostics-utils.js`
8. `10-core-bootstrap.js`

Optional slices are loaded on demand:

- `35-analytics-domain.js`
- `45-analytics-ui.js`

`32-object-domain.js` holds object-card state/history/tab orchestration, while `42-object-ui.js` holds object rendering, section editors, monitoring history and lab-study UI. This keeps deploy behavior compatible with the previous single-file version while making the object workspace substantially easier to maintain.
