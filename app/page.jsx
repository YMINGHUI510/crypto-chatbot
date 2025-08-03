"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import Navbar from "../components/Navbar";
import ChatHistory from "../components/ChatHistory";
import ChatInputBar from "../components/ChatInputBar";
import { fetchAIStreamResponse } from "./aiApi";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState("deepseek-chat");
  const [availableModels, setAvailableModels] = useState([]);
  const chatBottomRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const chatAreaRef = useRef(null);

  // Crypto 数据
  const [coins, setCoins] = useState([]);

  // 新增：首屏动画状态
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeFade, setWelcomeFade] = useState(false); // 控制淡出
  // 新增：错误提示状态
  const [errorTip, setErrorTip] = useState("");
  const [showErrorTip, setShowErrorTip] = useState(false);

  // 获取可用模型列表
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
        const isCurrentModelAvailable = data.models.some(model => model.value === selectedModel);
        if (!isCurrentModelAvailable && data.models.length > 0) {
          setSelectedModel(data.models[0].value);
        }
      } catch (error) {
        console.error('Failed to fetch available models:', error);
        setAvailableModels([
          { value: "deepseek-chat", label: "DeepSeek-V3", disabled: false },
          { value: "deepseek-reasoner", label: "DeepSeek-R1", disabled: false }
        ]);
      }
    }
    fetchAvailableModels();
  }, [selectedModel]);

  // 获取前10币种
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1")
      .then(res => res.json())
      .then(data => setCoins(data))
      .catch(err => console.error("Error fetching crypto data:", err));
  }, []);

  // 错误提示函数
  const showErrorTipMessage = useCallback((message) => {
    setErrorTip(message);
    setShowErrorTip(true);
    setTimeout(() => setShowErrorTip(false), 5000);
  }, []);
  const hideErrorTip = useCallback(() => setShowErrorTip(false), []);

  // 滚动到底部
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听滚动
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatArea;
      setShowScrollDown(scrollTop + clientHeight < scrollHeight - 30);
    };
    chatArea.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, [messages]);

  // 流式输出
  const handleStreamChunk = useCallback((content, reasoning, isComplete) => {
    flushSync(() => {
      setMessages((prevMsgs) => {
        let idx = prevMsgs.findIndex((msg) => msg.loading);
        if (idx === -1) {
          idx = prevMsgs.length - 1;
          while (idx >= 0 && prevMsgs[idx].role !== "assistant") idx--;
        }
        if (idx === -1) {
          return [...prevMsgs, { role: "assistant", content, reasoning: reasoning || "", streaming: !isComplete }];
        }
        const newMsgs = [...prevMsgs];
        if (isComplete) {
          newMsgs[idx] = { role: "assistant", content, reasoning: reasoning || "" };
          setIsThinking(false);
        } else {
          newMsgs[idx] = { role: "assistant", content, reasoning: reasoning || "", streaming: true };
        }
        return newMsgs;
      });
    });
  }, []);

  const handleSend = async (text) => {
    if (!text.trim() || isThinking) return;
    if (messages.length === 0 && showWelcome) {
      setWelcomeFade(true);
      setTimeout(() => {
        setShowWelcome(false);
        actuallySend(text);
      }, 300);
    } else {
      actuallySend(text);
    }
  };

  const actuallySend = async (text) => {
    setMessages((prevMsgs) => [
      ...prevMsgs,
      { role: "user", content: text },
      { role: "assistant", content: "", thinking: "", loading: true }
    ]);
    setIsThinking(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const chatMessages = messages
      .concat({ role: "user", content: text })
      .filter((msg) => !msg.loading)
      .map((msg) => ({ role: msg.role, content: msg.content }));
    try {
      await fetchAIStreamResponse(selectedModel, text, chatMessages, handleStreamChunk);
    } catch (error) {
      setMessages((prevMsgs) => {
        const idx = prevMsgs.findIndex((msg) => msg.loading);
        if (idx === -1) return prevMsgs;
        const newMsgs = [...prevMsgs];
        newMsgs[idx] = { role: "assistant", content: "[Error contacting AI service]", reasoning: "" };
        return newMsgs;
      });
      setIsThinking(false);
      showErrorTipMessage(error?.message || error?.toString() || "Unknown error");
    }
  };

  const containerClass = "w-full max-w-2xl mx-auto";
  const chatInputHeight = 120;
  const hasStreaming = messages.some(msg => msg.streaming);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      {showErrorTip && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm">{errorTip}</span>
            </div>
            <button onClick={hideErrorTip} className="ml-3">X</button>
          </div>
        </div>
      )}
      
      {/* 主体分栏 */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 左侧 Chatbot */}
        <div className="w-2/3 flex flex-col overflow-hidden bg-white">
          {showWelcome ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <h1 className="text-3xl font-bold mb-4">Crypto AI Chatbot</h1>
              <ChatInputBar onSend={handleSend} isThinking={isThinking} selectedModel={selectedModel} setSelectedModel={setSelectedModel} cardHeight={chatInputHeight} />
            </div>
          ) : (
            <>
              <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-4">
                <div className={containerClass}>
                  <ChatHistory messages={messages} />
                  <div ref={chatBottomRef} />
                </div>
              </div>
              <ChatInputBar onSend={handleSend} isThinking={isThinking} selectedModel={selectedModel} setSelectedModel={setSelectedModel} cardHeight={chatInputHeight} />
            </>
          )}
        </div>

        {/* 右侧 Top 10 Crypto */}
        <div className="w-1/3 p-4 bg-gray-50 border-l overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Top 10 Cryptos</h2>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Coin</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">24h %</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin) => (
                <tr key={coin.id} className="border-b">
                  <td className="p-2 flex items-center space-x-2">
                    <img src={coin.image} alt={coin.name} className="w-5 h-5" />
                    <span>{coin.symbol.toUpperCase()}</span>
                  </td>
                  <td className="p-2">${coin.current_price.toLocaleString()}</td>
                  <td className={`p-2 ${coin.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
