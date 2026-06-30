import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

export function App() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        {/* <img src={reactLogo} alt="React Logo" className="logo react-logo" /> */}
      </div>

      <h1>Ethan DApp Server</h1>
      <p>{/* Edit <code>src/client/App.tsx</code> and save to test HMR */}</p>
      <a href="/swagger" className="swagger-link">
        Swagger UI
      </a>
      <APITester />
    </div>
  );
}

export default App;
