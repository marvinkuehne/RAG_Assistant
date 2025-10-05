import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { Outlet } from 'react-router-dom';
import type { Navigation } from '@toolpad/core/AppProvider';


const NAVIGATION: Navigation = [
  { kind: 'header', title: 'AI Agent' },
  { kind: 'page', segment: '', title: 'New Chat' },
  { kind: 'page', segment: 'files', title: 'Files' },
  { kind: 'page', segment: 'history', title: 'Chat History' },
];

export default function AppMenu() {
  return (
    <ReactRouterAppProvider navigation={NAVIGATION}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ReactRouterAppProvider>
  );
}
	// •	DashboardLayout ist das Toolpad-Komponenten-Layout mit Sidebar
	// •	navigation ist das Menü mit den Seiten
	// •	Outlet ist der Platzhalter, wo die jeweilige Unterseite gerendert wird (AskPage, FilesPage, etc.)