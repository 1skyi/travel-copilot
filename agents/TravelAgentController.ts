import { TravelDNA, AgentStep, PersonalityProfile, TravelPlan } from "@/types/travel";
import { PreferenceAgent } from "./PreferenceAgent";
import { PlannerAgent } from "./PlannerAgent";

export class TravelAgentController {
  private preferenceAgent = new PreferenceAgent();
  private plannerAgent = new PlannerAgent();
  private progressListeners: Array<(steps: AgentStep[]) => void> = [];

  addProgressListener(fn: (steps: AgentStep[]) => void) {
    this.progressListeners.push(fn);
  }

  private emit(steps: AgentStep[]) {
    this.progressListeners.forEach((fn) => fn([...steps]));
  }

  async run(dna: TravelDNA): Promise<{
    profile: PersonalityProfile;
    plans: TravelPlan[];
  }> {
    const steps: AgentStep[] = [
      { id: "init", agentName: "Controller", status: "idle", message: "初始化 Agent 系统..." },
      { id: "pref", agentName: "PreferenceAgent", status: "idle", message: "等待分析偏好..." },
      { id: "plan", agentName: "PlannerAgent", status: "idle", message: "等待生成方案..." },
    ];

    steps[0].status = "thinking";
    steps[0].message = "正在加载旅行 DNA...";
    this.emit(steps);
    await this.delay(500);

    steps[0].status = "done";
    const destInfo = dna.destination ? dna.destination : "未指定";
    steps[0].message = "DNA 已加载: " + dna.style + " / " + dna.pace + " / " + destInfo;
    this.emit(steps);

    steps[1].status = "thinking";
    steps[1].message = "分析偏好: " + dna.style + " / " + dna.hotel + " / 避雷 " + dna.avoid.length + " 项";
    this.emit(steps);
    await this.delay(800);

    const profile = this.preferenceAgent.analyze(dna);

    steps[1].status = "done";
    steps[1].message = "人格识别: " + profile.persona;
    this.emit(steps);

    steps[2].status = "thinking";
    steps[2].message = "根据 " + profile.persona + " 生成方案...";
    this.emit(steps);
    await this.delay(1000);

    const plans = this.plannerAgent.generate(dna);

    steps[2].status = "done";
    steps[2].message = "已生成 " + plans.length + " 个方案";
    this.emit(steps);

    return { profile, plans };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
