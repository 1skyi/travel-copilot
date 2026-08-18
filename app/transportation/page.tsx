"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TransportationOptionCard } from "@/components/TransportationOptionCard";
import { searchTransportationForBrief } from "@/lib/transportation/client";
import type { TripBrief } from "@/types/trip";
import type {
  TransportationOption,
  TransportationSearchResult,
  TransportationSelection,
} from "@/types/transportation";

function TransportationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdx = Number(searchParams.get("plan")) || 0;

  const [brief, setBrief] = useState<TripBrief | null>(null);
  const [result, setResult] = useState<TransportationSearchResult | null>(null);
  const [selection, setSelection] = useState<TransportationSelection>({
    outbound: null,
    return: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawBrief = sessionStorage.getItem("s3-brief");
    const rawPlans = sessionStorage.getItem("s3-plans");
    if (!rawBrief || !rawPlans) {
      router.replace("/planning");
      return;
    }

    try {
      const parsedBrief = JSON.parse(rawBrief) as TripBrief;
      setBrief(parsedBrief);

      const rawSelection = sessionStorage.getItem("s3-transportation-selection");
      if (rawSelection) {
        const parsedSelection = JSON.parse(rawSelection) as TransportationSelection;
        setSelection({
          outbound: parsedSelection.outbound ?? null,
          return: parsedSelection.return ?? null,
        });
      }

      searchTransportationForBrief(parsedBrief)
        .then((searchResult) => {
          setResult(searchResult);
          setLoading(false);
        })
        .catch(() => {
          setError("交通数据暂时无法获取，请稍后重试");
          setLoading(false);
        });
    } catch {
      router.replace("/planning");
    }
  }, [router]);

  if (!brief) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const outboundOptions =
    result?.options.filter(
      (option) =>
        option.origin === brief.origin && option.destination === brief.destination
    ) ?? [];

  const returnOptions =
    result?.options.filter(
      (option) =>
        option.origin === brief.destination && option.destination === brief.origin
    ) ?? [];

  const selectOption = (option: TransportationOption) => {
    setSelection((prev) => {
      const isOutbound =
        option.origin === brief.origin && option.destination === brief.destination;
      return {
        outbound: isOutbound ? option : prev.outbound,
        return: isOutbound ? prev.return : option,
      };
    });
  };

  const handleSave = () => {
    sessionStorage.setItem("s3-transportation-selection", JSON.stringify(selection));
    router.push("/budget?plan=" + planIdx);
  };

  const statusText =
    result?.providerStatus
      .map((status) => status.provider + "：" + status.message)
      .join("；") || "";

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href={"/plans?selected=" + planIdx}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              返回方案选择
            </Button>
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            交通方案选择
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-3">选择你的往返交通</h1>
          <p className="text-sm text-muted-foreground mt-2">
            真实数据优先；没有数据时明确显示“暂无实时数据”，不会用 AI 编造票价。
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Search className="h-6 w-6 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">正在获取真实交通候选...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <DirectionSection
              title="去程"
              origin={brief.origin}
              destination={brief.destination}
              options={outboundOptions}
              selectedOption={selection.outbound}
              onSelect={selectOption}
              statusText={statusText}
            />
            <DirectionSection
              title="返程"
              origin={brief.destination}
              destination={brief.origin}
              options={returnOptions}
              selectedOption={selection.return}
              onSelect={selectOption}
              statusText={statusText}
            />
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selection.outbound ? "已选去程" : "未选去程"} ·{" "}
              {selection.return ? "已选返程" : "未选返程"}
            </p>
            <Button onClick={handleSave} className="gap-1.5">
              保存并进入预算
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DirectionSection({
  title,
  origin,
  destination,
  options,
  selectedOption,
  onSelect,
  statusText,
}: {
  title: string;
  origin: string;
  destination: string;
  options: TransportationOption[];
  selectedOption: TransportationOption | null;
  onSelect: (option: TransportationOption) => void;
  statusText: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {origin} → {destination}
          </p>
        </div>
        {selectedOption && (
          <Badge variant="secondary" className="text-[10px]">已选择</Badge>
        )}
      </div>

      {options.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <TransportationOptionCard
              key={option.id}
              option={option}
              selected={selectedOption?.id === option.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium">暂无实时数据</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {statusText || "当前数据源未返回可购买的交通方案"}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export default function TransportationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" />}>
      <TransportationPageContent />
    </Suspense>
  );
}
