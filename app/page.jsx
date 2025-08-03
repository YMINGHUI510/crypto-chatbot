"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import Navbar from "../components/Navbar";
import ChatHistory from "../components/ChatHistory";
import ChatInputBar from "../components/ChatInputBar";
import { fetchAIStreamResponse } from "./aiApi";

export default function Home() {
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "👋 Hello! I’m your Crypto AI Assistant. I can provide you with real-time cryptocurrency prices, market insights, and risk analysis. 🚀 What would you like to explore today?" 
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState("deepseek-chat");
  const [availableModels, setAvailableModels] = useState([]);
  const chatBottomRef = useRef(null);
  const chatAreaRef = useRef(null);
  const [coins, setCoins] = useState([]);
  const [hoveredCoin, setHoveredCoin] = useState("BTCUSDT");
  const [errorTip, setErrorTip] = useState("");
  const [showErrorTip, setShowErrorTip] = useState(false);

  // 获取模型
  useEffect(() => {
    async function fetchAvailableModels() {
      try {
        const response = await fetch('http://localhost:8088/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await response.json();
        setAvailableModels(data.models);
        if (!data.models.some(model => model.value === selectedModel) && data.models.length > 0) {
          setSelectedModel(data.models[0].value);
        }
      } catch {
        setAvailableModels([
          { value: "deepseek-chat", label: "DeepSeek-V3", disabled: false },
          { value: "deepseek-reasoner", label: "DeepSeek-R1", disabled: false }
        ]);
      }
    }
    fetchAvailableModels();
  }, [selectedModel]);

  // 获取币价数据
  useEffect(() => {
    const fetchData = () => {
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true")
        .then(res => res.json())
        .then(setCoins)
        .catch(console.error);
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 流式输出
  const handleStreamChunk = useCallback((content, reasoning, isComplete) => {
    flushSync(() => {
      setMessages(prevMsgs => {
        let idx = prevMsgs.findIndex(msg => msg.loading);
        if (idx === -1) {
          idx = prevMsgs.length - 1;
          while (idx >= 0 && prevMsgs[idx].role !== "assistant") idx--;
        }
        if (idx === -1) {
          return [...prevMsgs, { role: "assistant", content, reasoning: reasoning || "", streaming: !isComplete }];
        }
        const newMsgs = [...prevMsgs];
        newMsgs[idx] = isComplete
          ? { role: "assistant", content, reasoning: reasoning || "" }
          : { role: "assistant", content, reasoning: reasoning || "", streaming: true };
        if (isComplete) setIsThinking(false);
        return newMsgs;
      });
    });
  }, []);

  const handleSend = async (text) => {
    if (!text.trim() || isThinking) return;
    setMessages(prevMsgs => [
      ...prevMsgs,
      { role: "user", content: text },
      { role: "assistant", content: "", loading: true }
    ]);
    setIsThinking(true);
    try {
      await fetchAIStreamResponse(
        selectedModel,
        text,
        [...messages, { role: "user", content: text }].filter(msg => !msg.loading),
        handleStreamChunk
      );
    } catch (error) {
      setMessages(prevMsgs => {
        const idx = prevMsgs.findIndex(msg => msg.loading);
        if (idx === -1) return prevMsgs;
        const newMsgs = [...prevMsgs];
        newMsgs[idx] = { role: "assistant", content: "[Error contacting AI service]" };
        return newMsgs;
      });
      setIsThinking(false);
      setErrorTip(error?.message || "Unknown error");
      setShowErrorTip(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-gray-100">
      <Navbar />

      {showErrorTip && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl max-w-md animate-pulse">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{errorTip}</span>
            <button onClick={() => setShowErrorTip(false)} className="ml-3 hover:text-gray-200">✕</button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧 Chatbot */}
        <div className="w-2/3 flex flex-col overflow-hidden border-r border-gray-700">
          <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-4">
              <ChatHistory messages={messages} />
              <div ref={chatBottomRef} />
            </div>
          </div>
          <div className="p-4 bg-gray-800 shadow-inner">
            <ChatInputBar
              onSend={handleSend}
              isThinking={isThinking}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              cardHeight={120}
              className="bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* 右侧 Crypto */}
        <div className="w-1/3 p-6 bg-gray-900 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              🔥 Top 10 Cryptos
            </h2>
            <div className="flex items-center space-x-2 text-gray-400 text-xs">
              <svg className="animate-spin w-4 h-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
              </svg>
              <span>Auto-refreshing every 5s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {coins.map((coin) => {
              const change = coin.price_change_percentage_24h;
              let highlightClass = "bg-gray-800";
              if (change >= 5) highlightClass = "bg-green-800 shadow-lg shadow-green-500/50 animate-pulse";
              else if (change <= -5) highlightClass = "bg-red-800 shadow-lg shadow-red-500/50 animate-pulse";

              const prices = coin.sparkline_in_7d?.price || [];
              const maxPrice = Math.max(...prices);
              const minPrice = Math.min(...prices);

              return (
                <div
                  key={coin.id}
                  onMouseEnter={() => setHoveredCoin(coin.symbol.toUpperCase() + "USDT")}
                  onMouseLeave={() => setHoveredCoin("BTCUSDT")}
                  className={`${highlightClass} rounded-xl p-4 flex items-center justify-between transform transition duration-300 hover:scale-105`}
                >
                  <div className="flex items-center space-x-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full border border-gray-600" />
                    <div>
                      <p className="font-semibold">{coin.name} ({coin.symbol.toUpperCase()})</p>
                      <p className="text-sm text-gray-300">${coin.current_price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {change.toFixed(2)}%
                    </span>
                    {prices.length > 0 && (
                      <svg viewBox="0 0 100 30" className="w-24 h-8">
                        <polyline
                          fill="none"
                          stroke={change >= 0 ? "#22c55e" : "#ef4444"}
                          strokeWidth="2"
                          points={prices.map((p, i) => {
                            const x = (i / prices.length) * 100;
                            const y = 30 - ((p - minPrice) / (maxPrice - minPrice)) * 30;
                            return `${x},${y}`;
                          }).join(" ")}
                        />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TradingView */}
          <div className="mt-4 bg-gray-800 rounded-xl shadow-lg p-2">
            <iframe
              src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${hoveredCoin}&interval=30&hidesidetoolbar=0&theme=dark`}
              width="100%"
              height="500"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              className="rounded-lg"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
