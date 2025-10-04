// // // import DashboardLayout from "./components/DashboardLayout";
// // import AskPage from "./pages/AskPage";
// // import FilesPage from "./pages/FilesPage";
// // import {AppProvider} from '@toolpad/core/AppProvider';
// // import {DashboardLayout} from '@toolpad/core/DashboardLayout';
// // import {Routes, Route} from "react-router-dom";
// //
// //
// // // Container for my layout --> Dashboard frame, menu, content, etc.
// // function App() {
// //     return (
// //         <AppProvider>
// //             <DashboardLayout>
// //                 <Routes>
// //                     <Route path="ask" element={<AskPage/>}/>
// //                     <Route path="files" element={<FilesPage/>}/>
// //                 </Routes>
// //             </DashboardLayout>
// //         </AppProvider>
// //     );
// // }
// //
// // export default App;
// //
// //
// // //	•	AppProvider: Stellt Toolpad-Kontext bereit (damit das Dashboard weiß, wo es läuft)
// // // 	•	DashboardLayout: Der Rahmen mit Seitenleiste und Hauptbereich
//
//
// import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
// import FilesPage from "./pages/FilesPage";
// // import AskPage from "./pages/AskPage";   // falls vorhanden
// // import HistoryPage from "./pages/HistoryPage";
//
// function AppLayout() {
//   return (
//     <div className="min-h-screen flex bg-neutral-900 text-neutral-100">
//       {/* Sidebar */}
//       <aside className="w-64 shrink-0 border-r border-neutral-800 p-4">
//         <h1 className="text-xl font-bold mb-4">Toolpad (light)</h1>
//         <nav className="space-y-2">
//           <NavLink to="/" className="block px-3 py-2 rounded hover:bg-neutral-800">New Chat</NavLink>
//           <NavLink to="/files" className="block px-3 py-2 rounded hover:bg-neutral-800">Files</NavLink>
//           <NavLink to="/history" className="block px-3 py-2 rounded hover:bg-neutral-800">Chat History</NavLink>
//         </nav>
//       </aside>
//
//       {/* Content */}
//       <main className="flex-1 p-6">
//         <Routes>
//           {/* <Route path="/" element={<AskPage />} /> */}
//           <Route path="/files" element={<FilesPage />} />
//           {/* <Route path="/history" element={<HistoryPage />} /> */}
//           <Route path="*" element={<FilesPage />} />
//         </Routes>
//       </main>
//     </div>
//   );
// }
//
// export default function App() {
//   return (
//     <BrowserRouter>
//       <AppLayout />
//     </BrowserRouter>
//   );
// }