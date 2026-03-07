export type Experience = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  city: string;
  source: string;
};

export type FeedbackSignal = "like" | "dislike" | "save" | "not_now";
