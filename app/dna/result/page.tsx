"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DNAProfile } from "@/components/DNAProfile";
import { TravelDNA, PersonalityProfile } from "@/types/travel";
import { PreferenceAgent } from "@/agents/PreferenceAgent";

const DNA_STORAGE_KEY = "travel-dna";

export default function DNAResultPage() {
  const router = useRouter();
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DNA_STORAGE_KEY);
    if (!raw) { router.push("/dna"); return; }
    try {
      const parsed: TravelDNA = JSON.parse(raw);
      setDNA(parsed);
      setProfile(new PreferenceAgent().buildProfile(parsed));
    } catch { router.push("/dna"); }
  }, []);

  if (!dna || !profile) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">你的旅行 DNA</h1>
        <p className="text-sm text-muted-foreground mt-2">AI 已理解你的偏好 · {profile.persona}</p>
      </div>
      <DNAProfile dna={dna} profile={profile} />
      <div className="mt-8 flex gap-3">
        <Button variant="outline" size="lg" onClick={() => router.push("/dna")}>重新测试</Button>
        <Button size="lg" className="gap-2" onClick={() => router.push("/planning")}>
          <Sparkles className="h-4 w-4" />开始 AI 规划<ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
