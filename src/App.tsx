import { useState } from 'react';
import { Layout, type View } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Streams } from './views/Streams';
import { CreateStream } from './views/CreateStream';
import { History } from './views/History';
import { Settings } from './views/Settings';
import { Docs } from './views/Docs';

export default function App() {
  const [view, setView] = useState<View>('dashboard');

  return (
    <Layout view={view} onNav={setView}>
      {view === 'dashboard' && <Dashboard onNav={setView} />}
      {view === 'streams'   && <Streams onNav={setView} />}
      {view === 'create'    && <CreateStream />}
      {view === 'history'   && <History />}
      {view === 'settings'  && <Settings />}
      {view === 'docs'      && <Docs />}
    </Layout>
  );
}
