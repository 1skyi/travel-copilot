"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DNAQuestionCard } from "@/components/DNAQuestion";
import { TravelDNA, DNAQuestion } from "@/types/travel";

const DNA_STORAGE_KEY = "travel-dna";

const questions: DNAQuestion[] = [
  {
    id: "style",
    question: "你喜欢怎样的旅行？",
    type: "single",
    options: [
      { label: "特种兵旅行", icon: "🏃", desc: "一天安排很多地方" },
      { label: "慢旅行", icon: "🌿", desc: "少景点，高质量体验" },
      { label: "摄影旅行", icon: "📷", desc: "追求风景和照片" },
      { label: "美食旅行", icon: "🍜", desc: "围绕当地特色" },
      { label: "家庭旅行", icon: "👨‍👩‍👧", desc: "舒适、安全" },
    ],
  },
  {
    id: "pace",
    question: "你的旅行节奏？",
    type: "single",
    options: [
      { label: "快速探索", icon: "🏃", desc: "高密度打卡" },
      { label: "适中", icon: "🚶", desc: "张弛有度" },
      { label: "慢慢体验", icon: "🌿", desc: "深度沉浸" },
    ],
  },
  {
    id: "avoid",
    question: "旅行中你最不能接受什么？",
    subtitle: "可多选",
    type: "multi",
    options: [
      { label: "每天早起", icon: "😴" },
      { label: "长时间坐车", icon: "🚗" },
      { label: "人太多", icon: "👥" },
      { label: "排队", icon: "⏳" },
      { label: "频繁换酒店", icon: "🏨" },
      { label: "太累", icon: "😫" },
    ],
  },
  {
    id: "hotel",
    question: "住宿偏好？",
    type: "single",
    options: [
      { label: "经济型", icon: "🎒", desc: "干净即可" },
      { label: "舒适型", icon: "🏨", desc: "舒适方便" },
      { label: "精品酒店", icon: "✨", desc: "设计与服务" },
      { label: "特色民宿", icon: "🏡", desc: "有温度的住处" },
    ],
  },
  {
    id: "interest",
    question: "兴趣标签",
    subtitle: "可多选",
    type: "multi",
    options: [
      { label: "自然风光", icon: "🏔️" },
      { label: "历史文化", icon: "🏛️" },
      { label: "拍照", icon: "📸" },
      { label: "美食", icon: "🍽️" },
      { label: "购物", icon: "🛍️" },
      { label: "户外运动", icon: "🧗" },
    ],
  },
];

function deriveBudget(hotel: string): string {
  if (!hotel) return "medium";
  if (hotel === "经济型") return "low";
  if (hotel === "舒适型") return "medium";
  if (hotel === "精品酒店" || hotel === "特色民宿") return "high";
  return "medium";
}

function saveDNA(dna: TravelDNA) {
  if (typeof window !== "undefined") {
    localStorage.setItem(DNA_STORAGE_KEY, JSON.stringify(dna));
  }
}

export default function DNAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = searchParams.get("destination") || "";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const currentQ = questions[step];
  const isLast = step === questions.length - 1;
  const selectedForCurrent = answers[currentQ.id] || [];

  const handleToggle = (label: string) => {
    const current = selectedForCurrent;
    if (currentQ.type === "single") {
      setAnswers({ ...answers, [currentQ.id]: [label] });
    } else {
      const next = current.includes(label)
        ? current.filter((l) => l !== label)
        : [...current, label];
      setAnswers({ ...answers, [currentQ.id]: next });
    }
  };

  const handleNext = () => {
    if (isLast) {
      const hotel = (answers.hotel || [])[0] || "";
      const finalDNA: TravelDNA = {
        style: (answers.style || [])[0] || "",
        pace: (answers.pace || [])[0] || "",
        avoid: answers.avoid || [],
        hotel: hotel,
        interest: answers.interest || [],
        budget: deriveBudget(hotel),
        destination: destination || undefined,
        createdAt: new Date().toISOString(),
      };
      saveDNA(finalDNA);
      router.push("/dna/result");
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const hasSelection = selectedForCurrent.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      {destination && (
        <div className="mb-6">
          <Badge variant="outline" className="px-3 py-1 text-sm">目的地：{destination}</Badge>
        </div>
      )}

      <div className="w-full max-w-sm mb-8">
        <div className="flex gap-1.5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={"h-1 flex-1 rounded-full transition-colors " + (i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted")}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">{step + 1} / {questions.length}</p>
      </div>

      <DNAQuestionCard
        question={currentQ}
        selected={selectedForCurrent}
        onToggle={handleToggle}
      />

      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button variant="ghost" size="lg" onClick={handleBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            上一题
          </Button>
        )}
        <Button size="lg" disabled={!hasSelection} onClick={handleNext} className="gap-2">
          {isLast ? (
            <>
              <Sparkles className="h-4 w-4" />
              生成旅行 DNA
            </>
          ) : (
            <>
              下一题
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
