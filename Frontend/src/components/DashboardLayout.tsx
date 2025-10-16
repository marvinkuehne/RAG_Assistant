import {ReactRouterAppProvider} from '@toolpad/core/react-router';
import {DashboardLayout} from '@toolpad/core/DashboardLayout';
import {Outlet} from 'react-router-dom';
import type {Navigation} from '@toolpad/core/AppProvider';
import {useUserId} from "./useUserID.ts";

import {AppProvider} from '@toolpad/core/AppProvider';
import {Brain} from 'lucide-react'; // you can replace this with any icon or your logo


const NAVIGATION: Navigation = [
    {kind: 'header', title: 'AI Agent'},
    {kind: 'page', segment: '', title: 'New Chat'},
    {kind: 'page', segment: 'files', title: 'Files'},
];

export default function AppMenu() {
    const userId = useUserId();
    console.log("🔑 Current user ID:", userId);

    return (
        <AppProvider
            navigation={NAVIGATION}
            branding={{
                logo: <Brain size={22} style={{marginRight: 8}}/>,
                title: 'RAG Assistant',
            }}
        >
            <ReactRouterAppProvider navigation={NAVIGATION}>
                <DashboardLayout>
                    <Outlet/>
                </DashboardLayout>
            </ReactRouterAppProvider>
        </AppProvider>
    );
}
// •	DashboardLayout ist das Toolpad-Komponenten-Layout mit Sidebar
// •	navigation ist das Menü mit den Seiten
// •	Outlet ist der Platzhalter, wo die jeweilige Unterseite gerendert wird (AskPage, FilesPage, etc.)