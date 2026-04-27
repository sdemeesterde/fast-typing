import { FaGithub, FaInfoCircle } from "react-icons/fa";

export function BottomBar() {
  return (
    <footer
      className="col-span-3 flex items-center justify-between px-4 h-16 border
                bg-white border-gray-300
                dark:bg-[#292524] dark:text-[#d6d3d1] dark:border-[#44403c]"
    >
      <div className="flex items-center gap-2">
        <FaInfoCircle />
        <p>Press "escape" to pause the game.</p>
      </div>
      <a
        href="https://github.com/sdemeesterde/fast-typing"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2
             px-4 py-2
             rounded-lg
             border border-gray-300
             bg-white
             dark:bg-[#292524] dark:border-[#44403c]
             shadow-sm
             hover:shadow-md hover:-translate-y-[1px]
             active:translate-y-[1px] active:shadow-inner
             transition-all duration-100"
      >
        <FaGithub />
        <span>Source code</span>
      </a>
    </footer>
  );
}
