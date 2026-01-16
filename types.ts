
export enum FastingState {
  IDLE = 'IDLE',
  FASTING = 'FASTING',
  EATING = 'EATING'
}

export interface FastingPlan {
  id: string;
  name: string;
  fastHours: number;
  eatHours: number;
  description: string;
}

export interface FastRecord {
  id: string;
  startTime: number;
  endTime?: number;
  targetDuration: number;
  completed: boolean;
}

export interface AppState {
  currentFast: FastRecord | null;
  activePlanId: string;
  history: FastRecord[];
  weeklySchedule: Record<number, string>; // Day of week (0-6) -> Plan ID
}
