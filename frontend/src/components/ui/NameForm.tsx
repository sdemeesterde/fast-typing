import { useEffect, useRef, useState } from "react";
import type { UseConnectionReturn } from "../../hooks/useConnection";

type NameFormProps = {
  connection: UseConnectionReturn;
  onContinue: () => void;
};

export function NameForm({ connection, onContinue }: NameFormProps) {
  const isFormActive = !connection.state?.token;
  useEffect(() => {
    if (!isFormActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormActive]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  // Handle exceeding size limit of characters for username
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Prevent clicking outside from losing focus
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.focus();
  };
  return (
    <div
      className="fixed flex items-center justify-center bg-black/40 z-50"
      onMouseDown={handleContainerMouseDown}
    >
      <form
        className="p-6 rounded-lg shadow-xl flex flex-col gap-4 border
                  bg-white border-gray-300
                  dark:bg-[#292524] dark:text-[#f5f5f4] dark:border-[#57534e]"
        onSubmit={async (e) => {
          e.preventDefault();

          const trimmed = username.trim();
          if (!trimmed) return;
          if (trimmed.length > 30) return;

          try {
            await connection.login(trimmed);
            onContinue(); // only runs on success
          } catch {
            // error already handled via loginError state
          }
        }}
        onClick={(e) => e.stopPropagation()} // stop clicks on the form from bubbling
      >
        <h2 className="text-lg font-semibold">Enter your username</h2>

        <input
          ref={inputRef}
          maxLength={31}
          className="p-2 rounded border focus:outline-none
                    bg-white border-gray-300
                    dark:bg-[#1c1917] dark:border-[#57534e] dark:text-white"
          value={username}
          onChange={(e) => {
            const value = e.target.value;

            if (value.length > 30) {
              setUsernameError("Maximum 30 characters allowed");
              setUsername(value.slice(0, 30)); // still clamp
            } else {
              setUsernameError(null);
              setUsername(value);
            }
          }}
        />

        {usernameError && (
          <p className="-mt-3 text-sm text-red-500">{usernameError}</p>
        )}
        {connection.loginError && (
          <p className="-mt-3 text-sm text-red-500">
            {connection.loginError === "USERNAME_TAKEN" ? (
              <>
                <span>Username currently taken.</span>
                <br />
                <span>Usernames are released up to 1min after logout.</span>
              </>
            ) : (
              "Login failed"
            )}
          </p>
        )}
        <button
          type="submit"
          className="bg-[#a78bfa] text-black px-4 py-2 rounded font-medium hover:bg-[#c4b5fd] transition"
          disabled={
            !username.trim() ||
            connection.isLoading ||
            username.trim().length > 30
          }
        >
          Continue
        </button>
      </form>
    </div>
  );
}
