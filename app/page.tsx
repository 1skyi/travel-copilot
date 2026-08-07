"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const hotTopics = [
  { label: "新疆", icon: "🏔️" },
  { label: "云南", icon: "🌿" },
  { label: "日本", icon: "⛩️" },
  { label: "川西", icon: "🏞️" },
];

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleStart = () => {
    if (input.trim()) {
      router.push("/dna?destination=" + encodeURIComponent(input.trim()));
    } else {
      router.push("/dna");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <MapPin className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight">Travel Copilot</span>
      </div>

      {/* Chat Input */}
      <div className="w-full max-w-lg">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="我想去新疆旅游"
            className="w-full h-14 px-5 pr-14 text-lg rounded-2xl border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleStart}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Hot Topics */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {hotTopics.map((topic) => (
            <button
              key={topic.label}
              onClick={() => {
                setInput("我想去" + topic.label + "旅游");
                router.push("/dna?destination=" + encodeURIComponent(topic.label));
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border bg-muted/30 text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-all"
            >
              <span>{topic.icon}</span>
              {topic.label}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          AI 旅行决策助手 · 不是攻略，是决策
        </p>
      </div>
    </div>
  );
}
