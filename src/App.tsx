// Insight View shell, Figma 117:5653 at 1520 × 1088: Header | Feed 264 · canvas · panel 432.
// With Kharon open the left side is rail 48 + Kharon 264 (ticket 02), and the canvas narrows by 48.

import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { Rail } from './components/Rail';
import { Canvas } from './components/Canvas';
import { Panel } from './components/Panel';
import { Kharon } from './kharon/Kharon';
import { AppProvider, useApp } from './state/store';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { state } = useApp();
  return (
    <div className="flex h-full min-w-[1280px] flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        {state.kharonOpen ? <><Rail /><Kharon /></> : <Feed />}
        <Canvas />
        <Panel />
      </div>
    </div>
  );
}
