// // import DashboardLayout from "./components/DashboardLayout";
// import AskPage from "./pages/AskPage";
// import FilesPage from "./pages/FilesPage";
// import {AppProvider} from '@toolpad/core/AppProvider';
// import {DashboardLayout} from '@toolpad/core/DashboardLayout';
// import {Routes, Route} from "react-router-dom";
//
//
// // Container for my layout --> Dashboard frame, menu, content, etc.
// function App() {
//     return (
//         <AppProvider>
//             <DashboardLayout>
//                 <Routes>
//                     <Route path="ask" element={<AskPage/>}/>
//                     <Route path="files" element={<FilesPage/>}/>
//                 </Routes>
//             </DashboardLayout>
//         </AppProvider>
//     );
// }
//
// export default App;
//
//
// //	•	AppProvider: Stellt Toolpad-Kontext bereit (damit das Dashboard weiß, wo es läuft)
// // 	•	DashboardLayout: Der Rahmen mit Seitenleiste und Hauptbereich