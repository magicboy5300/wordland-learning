import { z } from 'zod';
export const practiceInput = z.object({
  lessonId: z.string().max(100), activityId: z.string().max(100), text: z.string().trim().max(3000).default(''), status: z.enum(['draft','completed']).default('completed'),
  strokes: z.array(z.array(z.tuple([z.number().int().min(0).max(400), z.number().int().min(0).max(400)])).min(1).max(24)).max(60).default([]),
  paper: z.boolean().default(false), checks: z.array(z.number().int().min(0).max(5)).max(6), checkedBy: z.enum(['self', 'parent']),
});
export function validatePractice(data, lesson) {
  const activity = lesson?.activities?.find((item) => item.id === data.activityId);
  if (!activity) throw Object.assign(new Error('没有找到这个实践活动'), { status: 404 });
  if(data.status==='draft')return {...data,activityTitle:activity.title};
  if(activity.kind==='write' && [...data.text].length < (activity.minChars || 1)) throw Object.assign(new Error(`先把作品补充到至少 ${activity.minChars || 1} 个字符，也可以先保存草稿`),{status:400});
  if (new Set(data.checks).size !== activity.checklist.length || data.checks.some((index) => index >= activity.checklist.length)) throw Object.assign(new Error('请逐项完成检查后再保存'), { status: 400 });
  if (activity.kind === 'write' && !data.text) throw Object.assign(new Error('先写下你的一句话吧'), { status: 400 });
  if (['draw','pinyinwrite'].includes(activity.kind) && !data.strokes.length && !data.paper) throw Object.assign(new Error('先写一写，或选择已在纸上练习'), { status: 400 });
  return { ...data, activityTitle: activity.title };
}
export function publicPractice(row) {
  return { lessonId: row.lesson_id, activityId: row.activity_id, activityTitle: row.activity_title, status:'completed', ...JSON.parse(row.content_json), checkedBy: row.checked_by, updatedAt: row.updated_at };
}
