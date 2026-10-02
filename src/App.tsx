import { useState, useCallback } from 'react';
import { Layout, type View } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Streams } from './views/Streams';
import { CreateStream } from './views/CreateStream';
import { History } from './views/History';
import { Settings } from './views/Settings';
import { Docs } from './views/Docs';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  // Incremented after a successful stream create/update so that list views re-fetch.
  const [refreshToken, setRefreshToken] = useState(0);
  // Category pre-selected from Dashboard CTA, passed into CreateStream.
  const [createCategory, setCreateCategory] = useState<string | undefined>();

  const handleNavToCreate = useCallback((category?: string) => {
    setCreateCategory(category);
    setView('create');
  }, []);

  const handleStreamCreated = useCallback(() => {
    setRefreshToken((t) => t + 1);
    setView('streams');
  }, []);

  return (
    <Layout view={view} onNav={setView}>
      {view === 'dashboard' && (
        <Dashboard onNav={setView} onNavToCreate={handleNavToCreate} refreshToken={refreshToken} />
      )}
      {view === 'streams' && (
        <Streams onNav={setView} refreshToken={refreshToken} />
      )}
      {view === 'create' && (
        <CreateStream initialCategory={createCategory} onSuccess={handleStreamCreated} />
      )}
      {view === 'history'   && <History refreshToken={refreshToken} />}
      {view === 'settings'  && <Settings />}
      {view === 'docs'      && <Docs />}
    </Layout>
  );
}
