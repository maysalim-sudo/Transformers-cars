import { useCallback, useEffect, useState } from "react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Diagnose from "./pages/Diagnose";
import { useScrollDrive } from "./hooks/useScrollDrive";

const HOME_ROUTES = ["home", "work", "services"];

export default function App() {
  const [route, setRoute] = useState<string>(
    () => window.location.hash.replace("#", "") || "home",
  );
  const { targetRef, phase } = useScrollDrive();

  useEffect(() => {
    const onHash = () => {
      const r = window.location.hash.replace("#", "") || "home";
      setRoute(r);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((r: string) => {
    if (window.location.hash.replace("#", "") !== r) {
      window.history.replaceState(null, "", `#${r}`);
    }
    setRoute(r);
    if (HOME_ROUTES.includes(r)) {
      window.setTimeout(
        () => {
          if (r === "home") {
            window.scrollTo({ top: 0, behavior: "auto" });
          } else {
            document
              .getElementById(r)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        },
        90,
      );
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-ink-950">
      <Nav route={route} onNavigate={navigate} />

      {route === "diagnose" ? (
        <Diagnose />
      ) : (
        <Home onNavigate={navigate} targetRef={targetRef} phase={phase} />
      )}

      <Footer onNavigate={navigate} />
    </div>
  );
}
