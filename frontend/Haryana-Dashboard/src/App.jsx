import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./component/AppLayout/AppLayout";
import Dashboard from "./pages/Dashboard/index";
import UploadGeoJson from "./pages/UploadGeoJson/UploadGeoJson";
import Smoothening from "./pages/Smoothening/Smoothening";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All pages share the AppLayout (sidebar + content area) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadGeoJson />} />
          <Route path="/smoothening" element={<Smoothening />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
