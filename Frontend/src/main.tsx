import { createRoot } from 'react-dom/client'
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import {StrictMode} from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.tsx'
import AskPage from "./pages/AskPage.tsx";
import './index.css';
import FilesPage from "./pages/FilesPage.tsx";

//Render page once URL is accessed
const router = createBrowserRouter([
  {
    element: <DashboardLayout />,    // Contains <ReactRouterAppProvider> + <DashboardLayout> + <Outlet />
    children: [
      { path: '', element: <AskPage /> },
      { path: 'files', element: <FilesPage /> },
      // { path: 'history', element: <ChatHistoryPage />,
      //   children: [{ path: ':chatId', element: <ChatPage /> }
      //   ]
      // },
    ]
  }
]);



//Entry point (Starts react):  take <App />- component and render it in <div id="root">-Element in index.html.
createRoot(document.getElementById('root')!).render(
   <StrictMode>
    <RouterProvider router = {router}></RouterProvider>
  </StrictMode>
);


