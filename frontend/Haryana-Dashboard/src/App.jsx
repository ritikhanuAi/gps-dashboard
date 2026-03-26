import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./component/AppLayout/AppLayout";
import Dashboard from "./pages/Dashboard/index";
import UploadGeoJson from "./pages/UploadGeoJson/UploadGeoJson";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All pages share the AppLayout (sidebar + content area) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadGeoJson />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
