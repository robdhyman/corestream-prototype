// data/case.ts reads ?case= from window.location at import time; the state tests run in Node, on the default case.
(globalThis as { window?: unknown }).window ??= { location: { search: '' } };
