export type User = { id: string; email: string; nickname: string; grade: number; semester: string };
export type Lesson = {
  id: string; title: string; subtitle: string; category: string; semester: string;
  characterCard?: {character:string;readings:string[];recognition:boolean;writing:boolean;bookPage:number;examples:string[]}; curriculumReferences?: {title:string;url:string;note:string}[]; activities?: Activity[]; alphabet?: boolean; unit?: string; unitTitle?: string; unitSubtitle?: string; practice?: string[];
  scene: string; minutes: number; color: string; knowledgeIds: string[]; story: string;
  intro: string; grade: number; order: number; version: number; reward: number; questionCount: number;
};
export type Textbook = { textbook_title: string; volume: string; chapter_path: string[] };
export type Point = {
  id: string; name: string; category: string; semesters: string[]; objectives: string[];
  confidence: number | null; textbooks: Textbook[]; warnings: string[]; aliases: string[];
};
export type ResponseRow = { id: string; question_id: string; prompt: string; answer: string | string[]; correct: number; hinted: number; explanation: string; created_at: string };
export type AttemptRow = { id: string; lesson_id: string; kind?: 'adventure' | 'review'; content_version: number; step: number; status: string; active_ms: number; started_at: string; updated_at: string; completed_at: string | null };
export type Question = { id: string; type: 'choice' | 'order'; prompt: string; options: string[]; focus?: string; illustration?: string; listen?: string; hideOptionPinyin?: boolean; audioOnly?: boolean; readingMode?: 'visual'; material?: string; skillId?: string; skillLabel?: string };
export type Attempt = AttemptRow & { lesson: Lesson; question: Question | null; results: ResponseRow[]; sources: Point[]; currentHint?: string | null };
export type Progress = { attempts: AttemptRow[]; completed: string[]; stars: number; activeMs: number; independentAnswers: number; review: string[]; completedReviews: number; latestCompleted: string[]; targets: Target[]; practiceCount: number };
export type Bootstrap = { user: User | null; lessons: Lesson[]; metadata: { pointCount: number; relationCount: number; semesterCounts: Record<string, number>; categoryCounts: Record<string, number>; source: string; gradeCounts: Record<string,number>; notice: string }; grades: {grade:number;label:string;stage:string;focus:string}[]; progress: Progress };
export type HistoryItem = AttemptRow & { lesson: Lesson; answers: number };
export type ReviewQueue = {
  items: { lessonId: string; lesson: Lesson; due: boolean; rounds: number; nextReviewAt: string | null; intervalDays: number; consolidated: boolean; mistakeCount: number; hintCount: number; lastAt: string; lastReviewedAt: string | null }[];
  completedCount: number; dueCount: number; pendingCount: number; availableLessons: Lesson[]; ongoing: { id: string; step: number; updated_at: string } | null;
};
export type RoomState = { placed: string[]; revision: number; updatedAt: string | null };

export type Activity = { id: string; kind: 'draw'|'pinyinwrite'|'write'|'speak'|'recite'; title: string; prompt: string; characters?: string[]; checklist: string[]; minChars?: number; maxChars?: number; recommendedLength?: string };
export type PracticeRecord = { lessonId: string; activityId: string; activityTitle: string; text: string; strokes: [number,number][][]; paper: boolean; checks: number[]; checkedBy: 'self'|'parent'; updatedAt: string; status?: 'draft'|'completed' };
export type Target = { id: string; lessonId: string; label: string; status: 'draft'|'unseen'|'practiced'|'independent'|'reviewed'|'self-recorded'|'parent-checked'; independentCount: number; lastAt: string | null };
