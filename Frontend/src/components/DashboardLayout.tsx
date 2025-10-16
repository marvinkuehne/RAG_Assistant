import {DashboardLayout} from '@toolpad/core/DashboardLayout';
import {Outlet} from 'react-router-dom';
import {useUserId} from "./useUserID.ts";
import {Brain} from "lucide-react";
import {ReactRouterAppProvider} from "@toolpad/core/react-router";
import type {Navigation} from "@toolpad/core";


const NAVIGATION: Navigation = [
    {kind: 'header', title: 'AI Agent'},
    {kind: 'page', segment: '', title: 'New Chat'},
    {kind: 'page', segment: 'files', title: 'Files'},
];


export default function AppMenu() {
    const userId = useUserId();
    console.log("🔑 Current user ID:", userId);

    return (
    <ReactRouterAppProvider
      navigation={NAVIGATION}
      branding={{
        logo: <Brain size={22} style={{ marginRight: 8, color: '#6366f1' }} />,
        title: 'RAG Assistant',
        homeUrl: '/', // optional: Clicking logo goes to New Chat
      }}
    >
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ReactRouterAppProvider>
  );
}
//   <ReactRouterAppProvider navigation={NAVIGATION}>
//     <DashboardLayout>
//       <Outlet />
//     </DashboardLayout>
//   </ReactRouterAppProvider>
// );
// }
// •	DashboardLayout ist das Toolpad-Komponenten-Layout mit Sidebar
// •	navigation ist das Menü mit den Seiten
// •	Outlet ist der Platzhalter, wo die jeweilige Unterseite gerendert wird (AskPage, FilesPage, etc.)