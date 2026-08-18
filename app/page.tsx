"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, MapPin, Zap, Play, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Memory } from "@/lib/memory";

const hotTopics = [
  { label: "新疆", icon: "🏔️" },
  { label: "云南", icon: "🌿" },
  { label: "日本", icon: "⛩️" },
  { label: "川西", icon: "🏞️" },
];

const exampleSentences = [
  "两个人，9月去新疆7天，从深圳出发，预算6000元",
  "和女朋友国庆去云南7天，喜欢拍照和美食",
  "一家三口去日本，想轻松一点，不赶路",
];

interface DemoTemplate {
  label: string;
  dest: string;
  days: number;
  dna: {
    style: string;
    pace: string;
    avoid: string[];
    hotel: string;
    interest: string[];
    budget: string;
  };
}

const demoTemplates: DemoTemplate[] = [
  {
    label: "📷 新疆7日摄影",
    dest: "新疆",
    days: 7,
    dna: { style: "摄影旅行", pace: "慢慢体验", avoid: ["人多", "频繁换酒店"], hotel: "特色民宿", interest: ["自然风光", "拍照"], budget: "high" },
  },
  {
    label: "🍜 云南7日美食",
    dest: "云南",
    days: 7,
    dna: { style: "美食旅行", pace: "适中", avoid: ["每天早起", "太累"], hotel: "舒适型", interest: ["美食", "历史文化"], budget: "medium" },
  },
  {
    label: "⛩️ 日本7日经典",
    dest: "日本",
    days: 7,
    dna: { style: "慢旅行", pace: "慢慢体验", avoid: ["排队", "长时间坐车"], hotel: "精品酒店", interest: ["历史文化", "购物", "美食"], budget: "high" },
  },
];

function applyDemo(template: DemoTemplate) {
  const dna = {
    ...template.dna,
    createdAt: new Date().toISOString(),
  };
  Memory.saveDNA(dna);
  return "/planning?destination=" + encodeURIComponent(template.dest) + "&days=" + template.days;
}

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleStart = () => {
    if (input.trim()) {
      router.push("/planning?query=" + encodeURIComponent(input.trim()));
    } else {
      router.push("/planning");
    }
  };

  const lastTrip = typeof window !== "undefined" ? Memory.getLastTrip() : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <MapPin className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight">Travel Copilot</span>
      </div>

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-4">
          <Sparkles className="h-3.5 w-3.5" /> AI 旅行决策 Agent
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">你的 AI 旅行决策助手</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
          不是攻略生成器。告诉我你的需求和预算，AI 帮你做旅行决策、控制预算、优化方案。
        </p>
      </div>

      {/* Chat Input */}
      <div className="w-full max-w-lg">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="两个人，9月去新疆7天，从深圳出发，预算6000元"
            className="w-full h-14 px-5 pr-14 text-base rounded-2xl border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleStart}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Example sentences */}
        <div className="mt-4 space-y-2">
          {exampleSentences.map((sentence) => (
            <button
              key={sentence}
              onClick={() => {
                setInput(sentence);
                router.push("/planning?query=" + encodeURIComponent(sentence));
              }}
              className="w-full flex items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-3.5 py-2.5 text-left text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-primary/30 transition-all"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span className="truncate">{sentence}</span>
            </button>
          ))}
        </div>

        {/* Hot Topics */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {hotTopics.map((topic) => (
            <button
              key={topic.label}
              onClick={() => {
                const text = "我想去" + topic.label + "旅游";
                setInput(text);
                router.push("/planning?query=" + encodeURIComponent(text));
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border bg-muted/30 text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-all"
            >
              <span>{topic.icon}</span>
              {topic.label}
            </button>
          ))}
        </div>

        {/* Resume last trip */}
        {lastTrip && (
          <div className="mt-6">
            <button
              onClick={() => router.push("/trip?plan=0")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed bg-muted/20 hover:bg-muted/40 transition-all text-left group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">继续上次的旅行</p>
                <p className="text-[10px] text-muted-foreground">{lastTrip.plan.title} · {lastTrip.destination}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        )}

        <Separator label="或快速体验 Demo" />

        {/* Demo Scenarios */}
        <div className="grid gap-2">
          {demoTemplates.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => {
                const url = applyDemo(tpl);
                router.push(url);
              }}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">{tpl.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tpl.dna.style} · {tpl.dna.pace} · ¥{tpl.dna.budget === "high" ? "8,500+" : tpl.dna.budget === "medium" ? "6,500" : "4,500"}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">Demo</Badge>
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

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}