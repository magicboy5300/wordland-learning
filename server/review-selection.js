import {z} from 'zod';
export const reviewSelection = z.object({grade:z.coerce.number().int().min(1).max(6).optional(),semester:z.enum(['上册','下册']).optional()});
export function scopeReviewQueue(state,sessions,selection,getLesson){
 const matches=(lesson)=>lesson && (!selection.grade||lesson.grade===selection.grade)&&(!selection.semester||lesson.semester===selection.semester);
 const sessionMatches=(session)=>JSON.parse(session.questions_json).every((question)=>matches(getLesson(question.lessonId)));
 const items=state.items.filter((item)=>matches(item.lesson));
 const active=sessions.filter((session)=>session.status==='in_progress'&&sessionMatches(session)).sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
 return {...state,items,pendingCount:items.filter((item)=>!item.consolidated).length,dueCount:items.filter((item)=>item.due).length,availableLessons:state.availableLessons.filter(matches),completedCount:sessions.filter((session)=>session.status==='completed'&&sessionMatches(session)).length,ongoing:active?{id:active.id,step:active.step,updated_at:active.updated_at}:null};
}
export function firstReviewLessons(pending,available,getLesson){
 const ids=pending.length?pending:available.map((lesson)=>lesson.id);
 const first=getLesson(ids[0]);
 return ids.filter((id)=>getLesson(id)?.grade===first?.grade).slice(0,2);
}
