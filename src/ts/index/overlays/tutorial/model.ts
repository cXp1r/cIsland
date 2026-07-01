export type TutorialAction = "next" | "back" | "skip" | "finish";

export type TutorialStep = {
  stepIndex: number;
  stepLabel: string;
  title: string;
  text: string;
};

export type TutorialState = {
  active: boolean;
  stepIndex: number;
};
