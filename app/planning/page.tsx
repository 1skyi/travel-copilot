"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequirementAgent } from "@/agents/RequirementAgent";
import { TravelDNA } from "@/types/travel";
import { TripBriefDraft, TripBriefField, RequirementQuestion, createEmptyDraft } from "@/types/trip";
import { DatePickerCalendar } from "@/components/DatePickerCalendar";

const BRIEF_KEY = "s3-brief";

function PlanningPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDest = searchParams.get("destination") || "";

  const agent = useMemo(() => new RequirementAgent(), []);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [brief, setBrief] = useState<TripBriefDraft>(createEmptyDraft());
  const [answered, setAnswered] = useState<TripBriefField[]>([]);
  const [phase, setPhase] = useState<"input" | "collecting">("input");
  const [nlInput, setNlInput] = useState("");
  const [question, setQuestion] = useState<RequirementQuestion | null>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const [free, setFree] = useState("");
  const [understanding, setUnderstanding] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("travel-dna");
    if (!raw) { router.push("/dna"); return; }
    try {
      setDNA(JSON.parse(raw));
    } catch { router.push("/dna"); }
  }, [router]);

  // 从 URL 参数预填 destination（Demo 场景入口）
  useEffect(() => {
    if (urlDest) {
      setBrief((b) => ({ ...b, destination: urlDest }));
      setAnswered((a) => {
        const next = [...a];
        if (!next.includes("destination")) next.push("destination");
        return next;
      });
    }
  }, [urlDest]);

  // 找到下一个未回答的字段
  const nextField = (b: TripBriefDraft, ans: TripBriefField[]): TripBriefField | null => {
    for (const f of agent.getFieldOrder()) {
      if (ans.includes(f)) continue;
      if (!agent.isFieldMissing(b, f)) {
        // 已经解析到，跳过
        continue;
      }
      return f;
    }
    return null;
  };

  const goToBrief = (b: TripBriefDraft) => {
    const full = agent.toFullBrief(b, dna);
    full.confirmed = false;
    sessionStorage.setItem(BRIEF_KEY, JSON.stringify(full));
    router.push("/trip/brief");
  };

  const handleNlSubmit = () => {
    if (!nlInput.trim()) return;
    const parsed = agent.parseNaturalLanguage(nlInput);
    const merged: TripBriefDraft = { ...brief, ...parsed };
    setBrief(merged);

    // 记录已解析到的字段
    const newAnswered: TripBriefField[] = [];
    for (const f of agent.getFieldOrder()) {
      if (!agent.isFieldMissing(merged, f)) newAnswered.push(f);
    }
    setAnswered(newAnswered);

    // 生成"AI 理解"（仅展示已解析字段）
    setUnderstanding(agent.summarizePresent(merged));

    const next = nextField(merged, newAnswered);
    if (!next) {
      goToBrief(merged);
      return;
    }
    setQuestion(agent.getQuestion(next));
    setMulti([]);
    setFree("");
    setPhase("collecting");
  };

  const handleAnswer = () => {
    if (!question) return;
    let value: unknown;

    if (question.type === "multi") {
      value = multi;
    } else if (question.type === "single") {
      value = free; // 来自选项 chips 或手动输入
    } else if (question.type === "number") {
      value = Number(free) || 0;
    } else if (question.type === "boolean") {
      value = free === "true";
    } else {
      value = free;
    }

    // 校验：避免空答案（avoid 允许为空）
    if (question.type === "multi" && question.field === "avoid") {
      // 允许跳过
    } else if (question.type === "multi" && multi.length === 0) {
      return;
    } else if ((question.type === "single" || question.type === "text" || question.type === "date") && String(value).trim() === "") {
      return;
    } else if (question.type === "number" && (Number(value) <= 0)) {
      return;
    }

    const merged = agent.applyAnswer(brief, question.field, value);
    setBrief(merged);
    const newAnswered = [...answered, question.field];
    setAnswered(newAnswered);

    const next = nextField(merged, newAnswered);
    if (!next) {
      goToBrief(merged);
      return;
    }
    setQuestion(agent.getQuestion(next));
    setMulti([]);
    setFree("");
  };

  const selectOption = (optValue: string) => {
    if (!question) return;
    if (question.type === "multi") {
      setMulti((m) => m.includes(optValue) ? m.filter((v) => v !== optValue) : [...m, optValue]);
    } else {
      setFree(optValue);
      if (question.type === "single") {
        // 单选点击即作答
        const merged = agent.applyAnswer(brief, question.field, optValue);
        setBrief(merged);
        const newAnswered = [...answered, question.field];
        setAnswered(newAnswered);
        const next = nextField(merged, newAnswered);
        if (!next) { goToBrief(merged); return; }
        setQuestion(agent.getQuestion(next));
        setMulti([]);
        setFree("");
      }
    }
  };

  const toggleMulti = (optValue: string) => {
    setMulti((m) => m.includes(optValue) ? m.filter((v) => v !== optValue) : [...m, optValue]);
  };

  const skipAvoid = () => {
    if (!question || question.field !== "avoid") return;
    const merged = agent.applyAnswer(brief, "avoid", []);
    setBrief(merged);
    const newAnswered: TripBriefField[] = [...answered, "avoid"];
    setAnswered(newAnswered);
    const next = nextField(merged, newAnswered);
    if (!next) { goToBrief(merged); return; }
    setQuestion(agent.getQuestion(next));
    setMulti([]);
    setFree("");
  };

  if (!dna) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  // ================= 阶段一：自然语言输入 =================
  if (phase === "input") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-xl">
          <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
            <Badge variant="secondary" className="text-xs">{dna.style}</Badge>
            <Badge variant="secondary" className="text-xs">{dna.pace}</Badge>
            <Badge variant="outline" className="text-xs">{dna.hotel}</Badge>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground mb-4">
              <Sparkles className="h-3.5 w-3.5" /> RequirementAgent
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">用一句话描述你的旅行需求</h1>
            <p className="text-sm text-muted-foreground">AI 会先理解需求，缺什么再问你什么，不会瞎猜</p>
          </div>

          <div className="relative">
            <textarea
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleNlSubmit(); } }}
              placeholder="例如：我从深圳出发，国庆和女朋友去新疆玩7天，每人预算4000，想拍照"
              rows={3}
              className="w-full px-5 py-4 pr-12 text-base rounded-2xl border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 resize-none"
            />
            <button
              onClick={handleNlSubmit}
              className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              disabled={!nlInput.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            Travel DNA 代表长期偏好 · 这里采集的是本次 Trip Brief
          </p>
        </div>
      </div>
    );
  }

  // ================= 阶段二：逐步追问 =================
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* 已理解的部分 */}
        {understanding.length > 0 && (
          <div className="mb-6 rounded-2xl border bg-muted/20 p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">AI 已理解</p>
            <div className="flex flex-wrap gap-1.5">
              {understanding.map((line, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] font-normal">{line}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* 进度 */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>需求采集进度</span>
            <span>{answered.length} / {agent.getFieldOrder().length}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: Math.min(100, Math.round((answered.length / agent.getFieldOrder().length) * 100)) + "%" }}
            />
          </div>
        </div>

        {/* 当前问题 */}
        {question && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{question.question}</h2>
                {question.type === "multi" && <p className="text-xs text-muted-foreground mt-1">可多选</p>}
              </div>
            </div>

            {question.type === "multi" ? (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {question.options?.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleMulti(opt.value)}
                      className={
                        "px-3.5 py-2 rounded-full text-sm border transition-all " +
                        (multi.includes(opt.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" disabled={multi.length === 0 && question.field !== "avoid"} onClick={handleAnswer}>
                    确认 <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  {question.field === "avoid" && (
                    <Button variant="outline" onClick={skipAvoid}>
                      跳过
                    </Button>
                  )}
                </div>
              </>
            ) : question.type === "single" ? (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {question.options?.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      className="px-3.5 py-2 rounded-full text-sm border transition-all bg-muted/30 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={free}
                    onChange={(e) => setFree(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                    placeholder="也可以直接输入"
                    className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button size="sm" onClick={handleAnswer}>确认</Button>
                </div>
              </>
            ) : question.type === "date" ? (
              <DatePickerCalendar
                value={free || undefined}
                minDate={question.field === "endDate" ? brief.startDate || undefined : undefined}
                onSelect={(isoDate) => {
                  // 日历点选即作答，与单选 chip 行为一致
                  const merged = agent.applyAnswer(brief, question.field, isoDate);
                  setBrief(merged);
                  const newAnswered = [...answered, question.field];
                  setAnswered(newAnswered);
                  const next = nextField(merged, newAnswered);
                  if (!next) { goToBrief(merged); return; }
                  setQuestion(agent.getQuestion(next));
                  setMulti([]);
                  setFree("");
                }}
              />
            ) : question.type === "number" ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  value={free}
                  onChange={(e) => setFree(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                  placeholder="请输入金额"
                  className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button size="sm" onClick={handleAnswer}>确认</Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={free}
                  onChange={(e) => setFree(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                  placeholder="请输入"
                  className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button size="sm" onClick={handleAnswer}>确认</Button>
              </div>
            )}
          </div>
        )}

        {/* 完成提示 */}
        {!question && (
          <div className="text-center py-12 animate-in fade-in">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">需求采集完成，正在生成 Trip Brief...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanningPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <PlanningPageContent />
    </Suspense>
  );
}
