import { useEffect, useState } from "react";

export function useDarkMode(): [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
] {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");

    if (stored) return stored === "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  return [darkMode, setDarkMode];
}
