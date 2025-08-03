import React from "react";
import { FaGithub, FaMoon, FaSun } from "react-icons/fa";

export default function Navbar() {
  return (
    <nav className="w-full h-14 flex items-center justify-between px-4 bg-transparent shadow-none border-b border-gray-200 z-20">
      <div className="flex items-center font-bold text-lg" style={{ color: '#222' }}>
        <span className="inline-block align-middle" style={{ width: 28, height: 28 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 128 128">
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-size="96" fill="#F7931A">₿</text>
</svg>

        </span>
        <span>CryptoChat</span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/YMINGHUI510/crypto-chatbot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl transition-all duration-200 hover:text-blue-600 hover:scale-110"
          style={{ color: '#222' }}
        >
          <FaGithub />
        </a>
      </div>
    </nav>
  );
} 