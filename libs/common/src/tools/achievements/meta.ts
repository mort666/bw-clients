import { Earned, Progress } from "./types";

function isProgress(achievement: any): achievement is Progress {
  return achievement.type === "progress" && "value" in achievement;
}

function isEarned(achievement: any): achievement is Earned {
  return !isProgress(achievement);
}

export { isProgress, isEarned };
