import { AchievementEarnedEvent, AchievementProgressEvent } from "./types";

function isProgressEvent(achievement: any): achievement is AchievementProgressEvent {
  return achievement.type === "progress" && "value" in achievement;
}

function isEarnedEvent(achievement: any): achievement is AchievementEarnedEvent {
  return !isProgressEvent(achievement);
}

export { isProgressEvent, isEarnedEvent };
